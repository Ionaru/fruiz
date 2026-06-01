import { mulberry32, seedStringToUint32 } from "./prng.ts";
import type { DifficultyMode, QuizTrackPayload } from "./types.ts";
import { resolvedPlaybackFromDbFields } from "./quizPlayback.ts";

export interface SelectableTrack {
  id: string;
  title: string;
  audioUrl: string;
  difficulty: "easy" | "hard";
  playbackGainDb: number | null;
  clipPlaybackGainDb: number | null;
  playStartSeconds: number | null;
  maxPlaySeconds: number | null;
  playbackGainSourceSize: number | null;
  playbackGainSourceMtimeMs: number | null;
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
  // "easy" narrows to easy-labeled tracks; "hard" spans the whole pool.
  let filtered = pool;
  if (difficulty === "easy") {
    filtered = pool.filter((track) => track.difficulty === "easy");
  }

  const copy = [...filtered];
  const rand = mulberry32(seedStringToUint32(seed));
  for (
    let shuffleIndex = copy.length - 1;
    shuffleIndex > 0;
    shuffleIndex--
  ) {
    const swapIndex = Math.floor(rand() * (shuffleIndex + 1));
    const left = copy[swapIndex];
    const right = copy[shuffleIndex];
    if (left === undefined || right === undefined) continue;
    copy[shuffleIndex] = left;
    copy[swapIndex] = right;
  }
  return copy.slice(0, take);
}

export function toQuizPayload(tracks: SelectableTrack[]): QuizTrackPayload[] {
  return tracks.map((track) => {
    const playback = resolvedPlaybackFromDbFields({
      playStartSeconds: track.playStartSeconds,
      maxPlaySeconds: track.maxPlaySeconds,
    });
    return {
      id: track.id,
      title: track.title,
      audioUrl: track.audioUrl,
      difficulty: track.difficulty,
      unavailable: false,
      playbackGainDb: track.playbackGainDb,
      clipPlaybackGainDb: track.clipPlaybackGainDb,
      playStartSeconds: playback.playStartSeconds,
      maxPlaySeconds: playback.maxPlaySeconds,
      playbackGainSourceSize: track.playbackGainSourceSize,
      playbackGainSourceMtimeMs: track.playbackGainSourceMtimeMs,
    };
  });
}
