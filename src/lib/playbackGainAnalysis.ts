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
import { audioLoudnessDuration, withSpan } from "./telemetry.ts";

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
 * Outcome of a single ffmpeg `loudnorm` pass:
 * - `measured`: ffmpeg ran and produced an integrated-loudness reading.
 * - `no_audio`: ffmpeg ran but the window had nothing to measure (e.g. a start
 *   past end-of-file). The pass succeeded — the result is cacheable.
 * - `failed`: ffmpeg could not run at all (missing binary / spawn error). This
 *   is transient, so callers must not cache and should retry on the next analyze.
 */
export type LoudnormResult =
  | { status: "measured"; gainDb: number }
  | { status: "no_audio" }
  | { status: "failed" };

/**
 * Runs one ffmpeg `loudnorm` pass and classifies the outcome. Pass a
 * {@link PlaybackGainWindow} to measure only the quiz clip window. The only
 * `failed` signal is ffmpeg failing to execute (the `catch`); a clean run that
 * yields no `input_i` is `no_audio`, not a failure — that distinction is what
 * lets callers cache an unmeasurable window without caching a transient outage.
 */
export function runLoudnorm(
  absoluteAudioPath: string,
  window?: PlaybackGainWindow,
): Promise<LoudnormResult> {
  const scope = window ? "clip-window" : "full-track";
  return withSpan("audio.loudness", async () => {
    const args = buildLoudnormArgs(absoluteAudioPath, window);
    const startedAt = performance.now();
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
      audioLoudnessDuration.record(
        (performance.now() - startedAt) / 1000,
        { scope },
      );
      return { status: "failed" };
    }
    audioLoudnessDuration.record(
      (performance.now() - startedAt) / 1000,
      { scope },
    );
    const inputI = parseLoudnormInputI(stderrText);
    if (inputI === null) return { status: "no_audio" };
    return {
      status: "measured",
      gainDb: clampPlaybackGainDb(PLAYBACK_TARGET_LUFS - inputI),
    };
  }, { scope });
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
  const result = await runLoudnorm(absoluteAudioPath, window);
  return result.status === "measured" ? result.gainDb : null;
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

/**
 * Pure rule turning a clip {@link LoudnormResult} into the value to persist:
 * - `failed` → `{ cache: false }`: a transient ffmpeg outage, so the clip gain
 *   is left untouched and re-measured on the next analyze (no-cache-on-failure).
 * - `no_audio` → cache the full-track fallback so an unmeasurable window does
 *   not re-run ffmpeg every analyze (`{ cache: false }` only if no full gain
 *   exists to fall back to).
 * - `measured` → cache the measured clip gain.
 */
export function resolveClipGainToStore(
  clip: LoudnormResult,
  fallbackFullGainDb: number | null,
): { cache: false } | { cache: true; gainDb: number } {
  if (clip.status === "failed") return { cache: false };
  const gainDb = clip.status === "measured" ? clip.gainDb : fallbackFullGainDb;
  if (gainDb === null) return { cache: false };
  return { cache: true, gainDb };
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
  const [fullMeasured, clipResult] = await Promise.all([
    needFull ? measurePlaybackGainDb(absolutePath) : Promise.resolve(undefined),
    needClip
      ? runLoudnorm(absolutePath, {
        startSeconds: resolvedStart,
        maxSeconds: resolvedMax,
      })
      : Promise.resolve<LoudnormResult | undefined>(undefined),
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
    // `clipResult` is defined whenever needClip is true (see Promise.all). A
    // failed pass means ffmpeg could not run — leave the clip gain untouched and
    // retry next analyze rather than caching a stale full-track fallback. A
    // `no_audio` pass (window past end-of-file) caches the full-track fallback
    // so it does not re-run every analyze; this also persists a successful full
    // pass instead of discarding it when only the clip window is unmeasurable.
    const clip = clipResult ?? { status: "failed" as const };
    const decision = resolveClipGainToStore(clip, effectiveFullGainDb);
    if (!decision.cache) return "ffmpeg_failed";
    update.clipPlaybackGainDb = decision.gainDb;
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

/**
 * Maps an {@link AnalyzePlaybackGainOutcome} onto spec 12's
 * `fruiz.playback_gain.backfill.track` `outcome` attribute (5 low-cardinality
 * values). The two "can't read the file" outcomes collapse to one label.
 */
export function backfillOutcomeLabel(
  outcome: AnalyzePlaybackGainOutcome,
): string {
  switch (outcome) {
    case "cache_hit":
      return "cache-hit";
    case "measured":
      return "measured";
    case "seeded_fingerprint":
      return "seeded";
    case "ffmpeg_failed":
      return "analysis-failed";
    case "invalid_audio_url":
    case "file_not_found":
      return "missing-or-invalid";
  }
}
