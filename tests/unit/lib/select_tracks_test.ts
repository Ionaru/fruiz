import { assertEquals } from "@std/assert";
import { selectTracksDeterministic } from "../../../src/lib/selectTracks.ts";
import type { SelectableTrack } from "../../../src/lib/selectTracks.ts";

function makeTrack(index: number): SelectableTrack {
  return {
    id: `t-${index}`,
    title: `Track ${index}`,
    audioUrl: `https://example.com/${index}.mp3`,
    difficulty: index % 2 === 0 ? "easy" : "hard",
    playbackGainDb: null,
    clipPlaybackGainDb: null,
    playStartSeconds: null,
    maxPlaySeconds: null,
    playbackGainSourceSize: null,
    playbackGainSourceMtimeMs: null,
  };
}

Deno.test("selectTracksDeterministic filters by difficulty", () => {
  const pool = Array.from({ length: 40 }, (_, index) => makeTrack(index));
  const easy = selectTracksDeterministic(pool, "easy", "SEED");
  assertEquals(easy.every((t) => t.difficulty === "easy"), true);
  // "hard" spans the whole pool (formerly "mixed"): both labels appear.
  const hard = selectTracksDeterministic(pool, "hard", "SEED");
  assertEquals(hard.length, 20);
  assertEquals(hard.some((t) => t.difficulty === "easy"), true);
  assertEquals(hard.some((t) => t.difficulty === "hard"), true);
});
