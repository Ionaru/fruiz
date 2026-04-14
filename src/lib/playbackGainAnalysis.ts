/**
 * Per-track loudness measurement for playback normalization (Option A).
 *
 * [ffmpeg.wasm](https://ffmpegwasm.netlify.app/) targets browsers; server-side Deno is a poor fit
 * (see ffmpegwasm/ffmpeg.wasm#110). This module shells out to a system `ffmpeg` binary instead.
 */
import { eq } from "drizzle-orm";

import type { DB } from "../db/db.ts";
import { tracks } from "../db/schema.ts";
import { absolutePathFromTracksAudioUrl } from "./audioFilePath.ts";
import {
  clampPlaybackGainDb,
  PLAYBACK_TARGET_LUFS,
} from "./playbackGainMath.ts";

function parseLoudnormInputI(stderrText: string): number | null {
  const match = new RegExp(/"input_i"\s*:\s*"(-?[0-9.]+)"/).exec(stderrText);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

/** Fingerprint derived from `Deno.stat` when `mtime` is present. */
export type PlaybackGainSourceFingerprint = {
  size: number;
  mtimeMs: number;
};

/**
 * Builds a cache fingerprint from file metadata. Returns `null` when `mtime` is
 * missing so callers never treat the file as cacheable without mtime.
 */
export function fingerprintFromFileInfo(
  info: Deno.FileInfo,
): PlaybackGainSourceFingerprint | null {
  if (info.mtime === null) return null;
  return { size: info.size, mtimeMs: info.mtime.getTime() };
}

/**
 * Returns true when stored DB columns match the live file fingerprint.
 */
export function storedFingerprintMatchesFile(
  storedSize: number | null,
  storedMtimeMs: number | null,
  file: PlaybackGainSourceFingerprint,
): boolean {
  return storedSize === file.size && storedMtimeMs === file.mtimeMs;
}

/**
 * True when both fingerprint columns were persisted (legacy rows may have gain
 * without a fingerprint).
 */
export function hasCompleteStoredFingerprint(
  storedSize: number | null,
  storedMtimeMs: number | null,
): boolean {
  return storedSize !== null && storedMtimeMs !== null;
}

export type AnalyzePlaybackGainOutcome =
  | "invalid_audio_url"
  | "file_not_found"
  | "cache_hit"
  | "seeded_fingerprint"
  | "measured"
  | "ffmpeg_failed";

export type AnalyzePlaybackGainOptions = {
  /** When true, always re-run ffmpeg if the file exists (ignores cache hit and seed-only path). */
  force?: boolean;
};

/**
 * Measures integrated loudness via ffmpeg `loudnorm` and returns gain in dB toward
 * {@link PLAYBACK_TARGET_LUFS}, clamped. Returns `null` if ffmpeg is missing or analysis fails.
 */
export async function measurePlaybackGainDb(
  absoluteAudioPath: string,
): Promise<number | null> {
  const args = [
    "-hide_banner",
    "-nostats",
    "-threads",
    "1",
    "-i",
    absoluteAudioPath,
    "-af",
    "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
    "-vn",
    "-sn",
    "-dn",
    "-f",
    "null",
    "-",
  ];
  let stderrText: string;
  try {
    const command = new Deno.Command("ffmpeg", {
      args,
      stderr: "piped",
      stdout: "piped",
    });
    const { stderr } = await command.output();
    stderrText = new TextDecoder().decode(stderr);
  } catch {
    return null;
  }
  const inputI = parseLoudnormInputI(stderrText);
  if (inputI === null) return null;
  const rawGainDb = PLAYBACK_TARGET_LUFS - inputI;
  return clampPlaybackGainDb(rawGainDb);
}

export async function analyzeAndStorePlaybackGainForTrack(
  drizzle: DB,
  trackId: string,
  audioUrl: string,
  options?: AnalyzePlaybackGainOptions,
): Promise<AnalyzePlaybackGainOutcome> {
  const force = options?.force === true;
  let absolutePath: string;
  try {
    absolutePath = absolutePathFromTracksAudioUrl(audioUrl);
  } catch {
    return "invalid_audio_url";
  }

  let stat: Deno.FileInfo;
  try {
    stat = await Deno.stat(absolutePath);
  } catch {
    return "file_not_found";
  }

  if (!stat.isFile) {
    return "file_not_found";
  }

  const row = await drizzle.query.tracks.findFirst({
    where: { id: trackId },
    columns: {
      playbackGainDb: true,
      playbackGainSourceSize: true,
      playbackGainSourceMtimeMs: true,
    },
  });

  const storedSize = row?.playbackGainSourceSize ?? null;
  const storedMtimeMs = row?.playbackGainSourceMtimeMs ?? null;
  const gainDb = row?.playbackGainDb ?? null;

  const fingerprint = fingerprintFromFileInfo(stat);

  if (!force && gainDb !== null && fingerprint !== null) {
    if (storedFingerprintMatchesFile(storedSize, storedMtimeMs, fingerprint)) {
      return "cache_hit";
    }
    if (!hasCompleteStoredFingerprint(storedSize, storedMtimeMs)) {
      await drizzle.update(tracks).set({
        playbackGainSourceSize: fingerprint.size,
        playbackGainSourceMtimeMs: fingerprint.mtimeMs,
      }).where(eq(tracks.id, trackId));
      return "seeded_fingerprint";
    }
  }

  const measured = await measurePlaybackGainDb(absolutePath);
  if (measured === null) {
    return "ffmpeg_failed";
  }

  const fpAfter = fingerprintFromFileInfo(stat);
  await drizzle.update(tracks).set({
    playbackGainDb: measured,
    playbackGainSourceSize: fpAfter?.size ?? null,
    playbackGainSourceMtimeMs: fpAfter?.mtimeMs ?? null,
  }).where(eq(tracks.id, trackId));

  return "measured";
}
