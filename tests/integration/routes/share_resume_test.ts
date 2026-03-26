import { assertEquals } from "jsr:@std/assert@1";
import { parseReplayLimitFromUrl } from "../../../lib/categories.ts";

Deno.test("bare quiz path without limit leaves replay unset on server", () => {
  assertEquals(parseReplayLimitFromUrl(new URLSearchParams()), null);
});
