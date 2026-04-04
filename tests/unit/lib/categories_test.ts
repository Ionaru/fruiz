import { assertEquals } from "@std/assert";
import { parseReplayLimitFromUrl } from "../../../src/lib/categories.ts";

Deno.test("parseReplayLimitFromUrl: missing → null", () => {
  assertEquals(parseReplayLimitFromUrl(new URLSearchParams()), null);
});

Deno.test("parseReplayLimitFromUrl: valid numbers", () => {
  assertEquals(parseReplayLimitFromUrl(new URLSearchParams("limit=0")), 0);
  assertEquals(parseReplayLimitFromUrl(new URLSearchParams("limit=3")), 3);
});

Deno.test("parseReplayLimitFromUrl: invalid → 0", () => {
  assertEquals(parseReplayLimitFromUrl(new URLSearchParams("limit=nan")), 0);
  assertEquals(parseReplayLimitFromUrl(new URLSearchParams("limit=-1")), 0);
});

Deno.test("parseReplayLimitFromUrl: empty value → 0", () => {
  assertEquals(parseReplayLimitFromUrl(new URLSearchParams("limit=")), 0);
});
