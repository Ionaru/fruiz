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
import {
  resolveMaxPlaySeconds,
  resolvePlayStartSeconds,
} from "./quizPlayback.ts";

/** Window over which to measure loudness; omit to measure the whole file. */
export type PlaybackGainWindow = {
  startSeconds: number;
  maxSeconds: number;
};

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
 * Builds the ffmpeg argument list for a `loudnorm` analysis pass. When a
 * {@link PlaybackGainWindow} is given, input seeking (`-ss`/`-t`) restricts the
 * analysis to the clip window the quiz actually plays.
 */
export function buildLoudnormArgs(
  absoluteAudioPath: string,
  window?: PlaybackGainWindow,
): string[] {
  const seek: string[] = [];
  if (window) {
    if (window.startSeconds > 0) {
      seek.push("-ss", String(window.startSeconds));
    }
    seek.push("-t", String(window.maxSeconds));
  }
  return [
    "-hide_banner",
    "-nostats",
    "-threads",
    "1",
    ...seek,
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
}

/**
 * Measures integrated loudness via ffmpeg `loudnorm` and returns gain in dB toward
 * {@link PLAYBACK_TARGET_LUFS}, clamped. Pass a {@link PlaybackGainWindow} to measure
 * only the quiz clip window. Returns `null` if ffmpeg is missing or analysis fails.
 */
export async function measurePlaybackGainDb(
  absoluteAudioPath: string,
  window?: PlaybackGainWindow,
): Promise<number | null> {
  const args = buildLoudnormArgs(absoluteAudioPath, window);
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

/**
 * Pure decision: which gains must be (re)measured. Full gain is invalidated by
 * file change only; clip gain is invalidated by file change OR a clip-window
 * shift. Legacy rows (gain present, fingerprint never seeded) keep their full
 * gain — {@link fingerprintStale} is only set when a stored fingerprint actually
 * mismatches the file.
 */
export function decideGainRecompute(params: {
  force: boolean;
  fullGainDb: number | null;
  clipGainDb: number | null;
  fingerprintStale: boolean;
  boundsChanged: boolean;
}): { needFull: boolean; needClip: boolean } {
  const { force, fullGainDb, clipGainDb, fingerprintStale, boundsChanged } =
    params;
  return {
    needFull: force || fullGainDb === null || fingerprintStale,
    needClip: force || clipGainDb === null || fingerprintStale || boundsChanged,
  };
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
      clipPlaybackGainDb: true,
      clipPlaybackGainStartSeconds: true,
      clipPlaybackGainMaxSeconds: true,
      playStartSeconds: true,
      maxPlaySeconds: true,
    },
  });

  const storedSize = row?.playbackGainSourceSize ?? null;
  const storedMtimeMs = row?.playbackGainSourceMtimeMs ?? null;
  const fullGainDb = row?.playbackGainDb ?? null;
  const clipGainDb = row?.clipPlaybackGainDb ?? null;

  const fingerprint = fingerprintFromFileInfo(stat);
  const storedComplete = hasCompleteStoredFingerprint(
    storedSize,
    storedMtimeMs,
  );
  const fingerprintStale = fingerprint !== null && storedComplete &&
    !storedFingerprintMatchesFile(storedSize, storedMtimeMs, fingerprint);

  const resolvedStart = resolvePlayStartSeconds(row?.playStartSeconds ?? null);
  const resolvedMax = resolveMaxPlaySeconds(row?.maxPlaySeconds ?? null);
  const boundsChanged = row?.clipPlaybackGainStartSeconds !== resolvedStart ||
    row?.clipPlaybackGainMaxSeconds !== resolvedMax;

  const { needFull, needClip } = decideGainRecompute({
    force,
    fullGainDb,
    clipGainDb,
    fingerprintStale,
    boundsChanged,
  });

  if (!needFull && !needClip) {
    // Both gains current. Seed the fingerprint for legacy rows that lack it.
    if (fingerprint !== null && !storedComplete) {
      await drizzle.update(tracks).set({
        playbackGainSourceSize: fingerprint.size,
        playbackGainSourceMtimeMs: fingerprint.mtimeMs,
      }).where(eq(tracks.id, trackId));
      return "seeded_fingerprint";
    }
    return "cache_hit";
  }

  // Full and clip passes are independent — run them concurrently.
  const [fullMeasured, clipMeasured] = await Promise.all([
    needFull ? measurePlaybackGainDb(absolutePath) : Promise.resolve(undefined),
    needClip
      ? measureClipGainDb(absolutePath, resolvedStart, resolvedMax)
      : Promise.resolve(undefined),
  ]);

  const update: Partial<typeof tracks.$inferInsert> = {};

  // Effective full-track gain after this run (freshly measured or already
  // stored), used as the clip fallback below.
  let effectiveFullGainDb = fullGainDb;
  if (needFull) {
    if (typeof fullMeasured !== "number") return "ffmpeg_failed";
    update.playbackGainDb = fullMeasured;
    effectiveFullGainDb = fullMeasured;
  }

  if (needClip) {
    // The clip window alone can be unmeasurable (e.g. a start past end-of-file)
    // even when the whole file measures fine. Fall back to the full-track gain
    // so the clip still caches — otherwise needClip stays true and ffmpeg
    // re-runs on every analyze. This also persists a successful full pass
    // instead of discarding it when only the clip pass fails.
    const clipGainDb = clipMeasured ?? effectiveFullGainDb;
    if (clipGainDb === null) return "ffmpeg_failed";
    update.clipPlaybackGainDb = clipGainDb;
    update.clipPlaybackGainStartSeconds = resolvedStart;
    update.clipPlaybackGainMaxSeconds = resolvedMax;
  }

  update.playbackGainSourceSize = fingerprint?.size ?? null;
  update.playbackGainSourceMtimeMs = fingerprint?.mtimeMs ?? null;

  await drizzle.update(tracks).set(update).where(eq(tracks.id, trackId));

  return "measured";
}

/**
 * Measures clip-window gain only (no DB write). Used by the admin recalc endpoint
 * to preview unsaved clip bounds. Returns `null` if ffmpeg fails.
 */
export function measureClipGainDb(
  absoluteAudioPath: string,
  startSeconds: number,
  maxSeconds: number,
): Promise<number | null> {
  return measurePlaybackGainDb(absoluteAudioPath, { startSeconds, maxSeconds });
}
