import { assertEquals } from "jsr:@std/assert@1";
import { normalizeAnswer } from "../../../lib/normalize.ts";

Deno.test("normalizeAnswer lowercases and strips punctuation", () => {
  assertEquals(normalizeAnswer("  Hello, World!  "), "hello world");
  assertEquals(normalizeAnswer("Frozen II"), "frozen ii");
});
