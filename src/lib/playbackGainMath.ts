/** Integrated loudness target used when measuring with ffmpeg `loudnorm` (EBU R128-style). */
export const PLAYBACK_TARGET_LUFS = -16;

/** Max absolute gain applied either way (dB). */
export const PLAYBACK_GAIN_CLAMP_DB = 12;

export function clampPlaybackGainDb(raw: number): number {
  return Math.max(
    -PLAYBACK_GAIN_CLAMP_DB,
    Math.min(PLAYBACK_GAIN_CLAMP_DB, raw),
  );
}

export function playbackGainDbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}
