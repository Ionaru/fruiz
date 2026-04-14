import { assertEquals, assertExists } from "@std/assert";
import { decodeSlug } from "../../../src/lib/slug.ts";
import { selectTracksDeterministic } from "../../../src/lib/selectTracks.ts";
import type { SelectableTrack } from "../../../src/lib/selectTracks.ts";

Deno.test("quiz path slug decodes and yields 20 deterministic tracks", () => {
  const decoded = decodeSlug("mA1Z");
  assertEquals(decoded?.difficulty, "mixed");
  assertExists(decoded);
  const pool: SelectableTrack[] = Array.from({ length: 22 }, (_, index) => ({
    id: `id-${index}`,
    title: `T${index}`,
    audioUrl: `u${index}`,
    difficulty: "easy",
    playbackGainDb: null,
    playStartSeconds: null,
    maxPlaySeconds: null,
  }));
  const picked = selectTracksDeterministic(
    pool,
    decoded.difficulty,
    decoded.code,
    20,
  );
  assertEquals(picked.length, 20);
});
