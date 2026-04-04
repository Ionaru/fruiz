import { assertEquals } from "@std/assert";
import { parseReplayLimitFromUrl } from "../../../src/lib/categories.ts";

Deno.test("bare quiz path without limit leaves replay unset on server", () => {
  assertEquals(parseReplayLimitFromUrl(new URLSearchParams()), null);
});
