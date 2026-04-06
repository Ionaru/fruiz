import { assertEquals } from "@std/assert";
import { decodeSlug, encodeSlug } from "../../../src/lib/slug.ts";

Deno.test("encodeSlug round-trips with decodeSlug", () => {
  const code = "A1Z";
  for (const d of ["easy", "hard", "mixed"] as const) {
    const slug = encodeSlug(d, code);
    assertEquals(decodeSlug(slug), { difficulty: d, code });
  }
});

Deno.test("decodeSlug returns null for invalid input", () => {
  assertEquals(decodeSlug(""), null);
  assertEquals(decodeSlug("x"), null);
  assertEquals(decodeSlug("e"), null);
  assertEquals(decodeSlug("eab"), null);
  assertEquals(decodeSlug("eaB1"), null);
  assertEquals(decodeSlug("ea-b"), null);
});
