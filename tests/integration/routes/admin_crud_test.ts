import { assertEquals } from "@std/assert";
import { formatSlugFromName } from "../../../src/lib/formatSlug.ts";

Deno.test("formatSlugFromName produces path-safe slugs", () => {
  assertEquals(formatSlugFromName("  Disney Hits!  "), "disney-hits");
});
