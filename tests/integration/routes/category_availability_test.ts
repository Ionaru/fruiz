import { assertEquals } from "@std/assert";
import { parseReplayLimitFromUrl } from "../../../src/lib/categories.ts";

Deno.test("replay limit parsing is shared with quiz routes", () => {
  const p = new URLSearchParams("limit=2");
  assertEquals(parseReplayLimitFromUrl(p), 2);
});
