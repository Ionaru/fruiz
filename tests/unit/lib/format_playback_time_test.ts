import { assertEquals } from "@std/assert";
import { formatPlaybackTime } from "../../../src/lib/quizPlayback.ts";

Deno.test("formatPlaybackTime: pads seconds to two digits", () => {
  assertEquals(formatPlaybackTime(14), "0:14");
  assertEquals(formatPlaybackTime(5), "0:05");
  assertEquals(formatPlaybackTime(0), "0:00");
});

Deno.test("formatPlaybackTime: rolls over into minutes", () => {
  assertEquals(formatPlaybackTime(60), "1:00");
  assertEquals(formatPlaybackTime(95), "1:35");
  assertEquals(formatPlaybackTime(3661), "61:01");
});

Deno.test("formatPlaybackTime: truncates rather than rounds", () => {
  assertEquals(formatPlaybackTime(14.9), "0:14");
});

Deno.test("formatPlaybackTime: a live media element can hand us nonsense", () => {
  assertEquals(formatPlaybackTime(-3), "0:00");
  assertEquals(formatPlaybackTime(Number.NaN), "0:00");
  assertEquals(formatPlaybackTime(Number.POSITIVE_INFINITY), "0:00");
});
