/** Default max clip length (seconds) when a track has no override. */
export const DEFAULT_MAX_PLAY_SECONDS = 30;

/** Fade-in at clip start (seconds). */
export const FADE_IN_SECONDS = 1;

/** Fade-out before stop (seconds). */
export const FADE_OUT_SECONDS = 1;

/** Minimum allowed max-play window so fades fit. */
export const MIN_PLAYABLE_WINDOW_SECONDS = FADE_IN_SECONDS + FADE_OUT_SECONDS +
  0.5;

const MAX_PLAY_START_SECONDS = 24 * 60 * 60;
const MAX_MAX_PLAY_SECONDS = 24 * 60 * 60;

export function resolvePlayStartSeconds(
  value: number | null | undefined,
): number {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(0, value), MAX_PLAY_START_SECONDS);
}

export function resolveMaxPlaySeconds(
  value: number | null | undefined,
): number {
  const base = value === null || value === undefined || !Number.isFinite(value)
    ? DEFAULT_MAX_PLAY_SECONDS
    : value;
  return Math.min(
    Math.max(MIN_PLAYABLE_WINDOW_SECONDS, base),
    MAX_MAX_PLAY_SECONDS,
  );
}

export function resolvedPlaybackFromDbFields(row: {
  playStartSeconds?: number | null;
  maxPlaySeconds?: number | null;
}): { playStartSeconds: number; maxPlaySeconds: number } {
  return {
    playStartSeconds: resolvePlayStartSeconds(row.playStartSeconds ?? null),
    maxPlaySeconds: resolveMaxPlaySeconds(row.maxPlaySeconds ?? null),
  };
}

/**
 * Clamp start and max play so the clip fits inside known media duration.
 * Call from the client once `HTMLMediaElement.duration` is finite.
 */
export function clampStartAndMaxToDuration(
  playStartSeconds: number,
  maxPlaySeconds: number,
  durationSeconds: number,
): { playStartSeconds: number; maxPlaySeconds: number } {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return { playStartSeconds, maxPlaySeconds };
  }
  const start = Math.min(
    playStartSeconds,
    Math.max(0, durationSeconds - MIN_PLAYABLE_WINDOW_SECONDS),
  );
  const maxEnd = Math.max(MIN_PLAYABLE_WINDOW_SECONDS, durationSeconds - start);
  const maxPlayClamped = Math.min(maxPlaySeconds, maxEnd);
  return {
    playStartSeconds: start,
    maxPlaySeconds: Math.max(MIN_PLAYABLE_WINDOW_SECONDS, maxPlayClamped),
  };
}

export type ParsedPlaybackFields =
  | { ok: true; playStartSeconds: number | null; maxPlaySeconds: number | null }
  | { ok: false };

/**
 * Parse admin form fields. Empty strings mean "null in DB" (defaults).
 */
export function parseTrackPlaybackFormFields(
  form: FormData,
): ParsedPlaybackFields {
  const startEntry = form.get("playStartSeconds");
  const maxEntry = form.get("maxPlaySeconds");
  const rawStart = typeof startEntry === "string" ? startEntry.trim() : "";
  const rawMax = typeof maxEntry === "string" ? maxEntry.trim() : "";

  let playStartSeconds: number | null = null;
  if (rawStart !== "") {
    const parsedStart = Number(rawStart);
    if (!Number.isFinite(parsedStart) || parsedStart < 0) {
      return { ok: false };
    }
    playStartSeconds = Math.min(parsedStart, MAX_PLAY_START_SECONDS);
  }

  let maxPlaySeconds: number | null = null;
  if (rawMax !== "") {
    const parsedMax = Number(rawMax);
    if (
      !Number.isFinite(parsedMax) || parsedMax < MIN_PLAYABLE_WINDOW_SECONDS
    ) {
      return { ok: false };
    }
    maxPlaySeconds = Math.min(parsedMax, MAX_MAX_PLAY_SECONDS);
  }

  return { ok: true, playStartSeconds, maxPlaySeconds };
}
