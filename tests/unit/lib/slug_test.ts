import { assertEquals } from "jsr:@std/assert@1";
import { decodeSlug, encodeSlug } from "../../../lib/slug.ts";

Deno.test("encodeSlug round-trips with decodeSlug", () => {
  const seed = "abc12fg";
  for (const d of ["easy", "hard", "mixed"] as const) {
    const slug = encodeSlug(d, seed);
    assertEquals(decodeSlug(slug), { difficulty: d, seed });
  }
});

Deno.test("decodeSlug returns null for invalid input", () => {
  assertEquals(decodeSlug(""), null);
  assertEquals(decodeSlug("x"), null);
  assertEquals(decodeSlug("e"), null);
  assertEquals(decodeSlug("eabc"), null);
  assertEquals(decodeSlug("eshort"), null);
});
