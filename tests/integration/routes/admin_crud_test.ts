import { assertEquals } from "jsr:@std/assert@1";
import { formatSlugFromName } from "../../../lib/formatSlug.ts";

Deno.test("formatSlugFromName produces path-safe slugs", () => {
  assertEquals(formatSlugFromName("  Disney Hits!  "), "disney-hits");
});
