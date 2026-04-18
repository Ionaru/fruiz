import { assertEquals } from "@std/assert";
import { selectTracksDeterministic } from "../../../src/lib/selectTracks.ts";
import type { SelectableTrack } from "../../../src/lib/selectTracks.ts";

const pool: SelectableTrack[] = Array.from({ length: 40 }, (_, index) => ({
  id: `t${index}`,
  title: `Title ${index}`,
  audioUrl: `a${index}`,
  difficulty: index % 2 === 0 ? "easy" : "hard",
  playbackGainDb: null,
  playStartSeconds: null,
  maxPlaySeconds: null,
  playbackGainSourceSize: null,
  playbackGainSourceMtimeMs: null,
}));

Deno.test("selectTracksDeterministic returns 20 tracks in stable order for same seed", () => {
  const a = selectTracksDeterministic(pool, "mixed", "seed1", 20);
  const b = selectTracksDeterministic(pool, "mixed", "seed1", 20);
  assertEquals(a.length, 20);
  assertEquals(a.map((t) => t.id), b.map((t) => t.id));
});

Deno.test("selectTracksDeterministic filters by difficulty", () => {
  const easy = selectTracksDeterministic(pool, "easy", "s2", 20);
  assertEquals(easy.length, 20);
  assertEquals(easy.every((t) => t.difficulty === "easy"), true);
});
