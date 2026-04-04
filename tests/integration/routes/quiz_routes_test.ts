import { assertEquals } from "@std/assert";
import { decodeSlug } from "../../../src/lib/slug.ts";
import { selectTracksDeterministic } from "../../../src/lib/selectTracks.ts";
import type { SelectableTrack } from "../../../src/lib/selectTracks.ts";

Deno.test("quiz path slug decodes and yields 20 deterministic tracks", () => {
  const decoded = decodeSlug("mabcdef1");
  assertEquals(decoded?.difficulty, "mixed");
  const pool: SelectableTrack[] = Array.from({ length: 22 }, (_, i) => ({
    id: `id-${i}`,
    title: `T${i}`,
    audioUrl: `u${i}`,
    difficulty: "easy",
  }));
  const picked = selectTracksDeterministic(
    pool,
    decoded!.difficulty,
    decoded!.seed,
    20,
  );
  assertEquals(picked.length, 20);
});
