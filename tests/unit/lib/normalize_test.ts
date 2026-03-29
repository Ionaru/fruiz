import { assertEquals } from "@std/assert";
import { normalizeAnswer } from "../../../lib/normalize.ts";

Deno.test("normalizeAnswer lowercases and strips punctuation", () => {
  assertEquals(normalizeAnswer("  Hello, World!  "), "hello world");
  assertEquals(normalizeAnswer("Frozen II"), "frozen ii");
});
