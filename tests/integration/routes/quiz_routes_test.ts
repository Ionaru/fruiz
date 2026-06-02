import { assertEquals } from "@std/assert";
import { decodeSlug, encodeSlug } from "../../../src/lib/slug.ts";

Deno.test("decodeSlug maps legacy 'm' (mixed) slug to hard", () => {
  const decoded = decodeSlug("mABC");
  assertEquals(decoded?.difficulty, "hard");
  assertEquals(decoded?.code, "ABC");
});

Deno.test("legacy 'm' slug canonicalizes to 'h' via encodeSlug", () => {
  const decoded = decodeSlug("mABC");
  if (!decoded) throw new Error("decode failed");
  const encoded = encodeSlug(decoded.difficulty, decoded.code);
  assertEquals(encoded, "hABC");
});
