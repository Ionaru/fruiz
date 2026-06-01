import { assertEquals } from "@std/assert";
import { decodeSlug, encodeSlug } from "../../../src/lib/slug.ts";
import type { DifficultyMode } from "../../../src/lib/types.ts";

Deno.test("encodeSlug/decodeSlug round-trips difficulties", () => {
  const cases: { d: DifficultyMode; code: string }[] = [
    { d: "easy", code: "A1B" },
    { d: "hard", code: "Z9Z" },
  ];
  for (const { d, code } of cases) {
    const slug = encodeSlug(d, code);
    assertEquals(decodeSlug(slug), { difficulty: d, code });
  }
});

Deno.test("decodeSlug maps legacy 'm' (mixed) prefix to hard", () => {
  assertEquals(decodeSlug("m000"), { difficulty: "hard", code: "000" });
});

Deno.test("decodeSlug rejects invalid input", () => {
  const cases = ["", "x", "eAB", "e12", "eABCD", "zABC", "1ABC"];
  for (const slug of cases) {
    assertEquals(decodeSlug(slug), null);
  }
});
