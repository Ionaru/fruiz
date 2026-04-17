import type { QuizProgress, QuizTrackPayload } from "./types.ts";

export const STORAGE_KEY_PREFIX = "fruiz-quiz:";

export function buildDefaultProgress(
  trackList: QuizTrackPayload[],
  quizPath: string,
): QuizProgress {
  return {
    quizPath,
    score: 0,
    tracks: trackList.map((track) => ({
      trackId: track.id,
      status: track.unavailable ? "unavailable" : "unanswered",
      selectedTitle: null,
      replayCount: 0,
    })),
  };
}

export function isComplete(progress: QuizProgress): boolean {
  return progress.tracks.every(
    (entry) => entry.status !== "unanswered" && entry.status !== "skipped",
  );
}

export function canEndQuizWithSkippedRemaining(
  progress: QuizProgress,
): boolean {
  const hasUnanswered = progress.tracks.some(
    (entry) => entry.status === "unanswered",
  );
  const hasSkipped = progress.tracks.some(
    (entry) => entry.status === "skipped",
  );
  return !hasUnanswered && hasSkipped;
}

export function scoreFromProgress(progress: QuizProgress): number {
  return progress.tracks.filter(
    (entry) => entry.status === "correct" || entry.status === "unavailable",
  ).length;
}

/**
 * After the current track is marked skipped, pick where focus should go:
 * circular scan from the next list index, preferring `unanswered` while any
 * exist globally; otherwise the first `skipped` track in that scan.
 */
export function findNextTrackAfterSkip(
  trackList: QuizTrackPayload[],
  progressAfterSkip: QuizProgress,
  currentTrackId: string,
): string {
  const trackCount = trackList.length;
  if (trackCount === 0) return currentTrackId;
  const currentIndex = trackList.findIndex(
    (track) => track.id === currentTrackId,
  );
  if (currentIndex < 0) return currentTrackId;

  const hasAnyUnanswered = progressAfterSkip.tracks.some(
    (row) => row.status === "unanswered",
  );
  const targetStatus: "unanswered" | "skipped" = hasAnyUnanswered
    ? "unanswered"
    : "skipped";

  for (let offset = 1; offset <= trackCount; offset++) {
    const next = trackList[(currentIndex + offset) % trackCount];
    if (!next) break;
    const status = progressAfterSkip.tracks.find(
      (row) => row.trackId === next.id,
    )?.status;
    if (status === targetStatus) return next.id;
  }
  return currentTrackId;
}

/**
 * On resume/reload, prefer the first track in quiz order that is still
 * `unanswered` (therefore unskipped). Fall back to the provided current id when
 * valid, otherwise the first track id.
 */
export function findResumeActiveTrackId(
  trackList: QuizTrackPayload[],
  progressState: QuizProgress,
  currentTrackId: string | null,
): string | null {
  for (const track of trackList) {
    const status = progressState.tracks.find(
      (row) => row.trackId === track.id,
    )?.status;
    if (status === "unanswered") return track.id;
  }
  if (
    currentTrackId && trackList.some((track) => track.id === currentTrackId)
  ) {
    return currentTrackId;
  }
  return trackList[0]?.id ?? null;
}

/** Returns merged progress from `localStorage`, or `null` if missing or invalid. */
export function tryMergeStoredProgress(
  raw: string | null,
  quizPath: string,
  tracks: QuizTrackPayload[],
): QuizProgress | null {
  if (!raw) return null;
  let parsed: QuizProgress;
  try {
    parsed = JSON.parse(raw) as QuizProgress;
  } catch {
    return null;
  }
  if (parsed.quizPath !== quizPath || !Array.isArray(parsed.tracks)) {
    return null;
  }
  const validIds = new Set(tracks.map((track) => track.id));
  if (
    parsed.tracks.length !== tracks.length ||
    !parsed.tracks.every((row) => validIds.has(row.trackId))
  ) {
    return null;
  }
  return { ...parsed, score: scoreFromProgress(parsed) };
}
