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
): Promise<void> {
  let absolutePath: string;
  try {
    absolutePath = absolutePathFromTracksAudioUrl(audioUrl);
  } catch {
    return;
  }
  const gainDb = await measurePlaybackGainDb(absolutePath);
  if (gainDb === null) return;
  await drizzle.update(tracks).set({ playbackGainDb: gainDb }).where(
    eq(tracks.id, trackId),
  );
}
