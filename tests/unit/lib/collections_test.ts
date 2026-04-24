import { assertEquals } from "@std/assert";
import { formatCategoryProgressLine } from "../../../src/lib/collectionProgress.ts";

Deno.test("formatCategoryProgressLine: some remain → 'N left to collect in …'", () => {
  assertEquals(
    formatCategoryProgressLine({
      collected: 12,
      total: 100,
      categoryName: "Jazz",
    }),
    "88 left to collect in Jazz.",
  );
});

Deno.test("formatCategoryProgressLine: exactly one remaining uses singular-safe phrasing", () => {
  assertEquals(
    formatCategoryProgressLine({
      collected: 99,
      total: 100,
      categoryName: "Jazz",
    }),
    "1 left to collect in Jazz.",
  );
});

Deno.test("formatCategoryProgressLine: complete → celebratory 'All N collected in …'", () => {
  assertEquals(
    formatCategoryProgressLine({
      collected: 50,
      total: 50,
      categoryName: "Disney Hits",
    }),
    "All 50 collected in Disney Hits!",
  );
});

Deno.test("formatCategoryProgressLine: collected exceeds total is still treated as complete", () => {
  // Defensive: caller should never pass this, but clamp rather than render '-1 left'.
  assertEquals(
    formatCategoryProgressLine({
      collected: 101,
      total: 100,
      categoryName: "Jazz",
    }),
    "All 100 collected in Jazz!",
  );
});
