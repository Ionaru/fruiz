import { mulberry32, seedStringToUint32 } from "./prng.ts";
import type { DifficultyMode, QuizTrackPayload } from "./types.ts";

export interface SelectableTrack {
  id: string;
  title: string;
  audioUrl: string;
  difficulty: "easy" | "hard";
}

/**
 * Deterministic Fisher–Yates shuffle then take the first 20 tracks.
 * Caller must ensure the pool has at least 20 items when required.
 */
export function selectTracksDeterministic(
  pool: SelectableTrack[],
  difficulty: DifficultyMode,
  seed: string,
  take = 20,
): SelectableTrack[] {
  let filtered = pool;
  if (difficulty === "easy") {
    filtered = pool.filter((track) => track.difficulty === "easy");
  } else if (difficulty === "hard") {
    filtered = pool.filter((track) => track.difficulty === "hard");
  }

  const copy = [...filtered];
  const rand = mulberry32(seedStringToUint32(seed));
  for (
    let shuffleIndex = copy.length - 1;
    shuffleIndex > 0;
    shuffleIndex--
  ) {
    const swapIndex = Math.floor(rand() * (shuffleIndex + 1));
    [copy[shuffleIndex], copy[swapIndex]] = [
      copy[swapIndex]!,
      copy[shuffleIndex]!,
    ];
  }
  return copy.slice(0, take);
}

export function toQuizPayload(tracks: SelectableTrack[]): QuizTrackPayload[] {
  return tracks.map((track) => ({
    id: track.id,
    title: track.title,
    audioUrl: track.audioUrl,
    difficulty: track.difficulty,
    unavailable: false,
  }));
}
