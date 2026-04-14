import { assertEquals } from "@std/assert";

import {
  clampStartAndMaxToDuration,
  DEFAULT_MAX_PLAY_SECONDS,
  MIN_PLAYABLE_WINDOW_SECONDS,
  parseTrackPlaybackFormFields,
  resolveMaxPlaySeconds,
  resolvePlayStartSeconds,
} from "../../../src/lib/quizPlayback.ts";

Deno.test("resolvePlayStartSeconds treats null and negatives as zero", () => {
  assertEquals(resolvePlayStartSeconds(null), 0);
  assertEquals(resolvePlayStartSeconds(undefined), 0);
  assertEquals(resolvePlayStartSeconds(-3), 0);
  assertEquals(resolvePlayStartSeconds(Number.NaN), 0);
  assertEquals(resolvePlayStartSeconds(12.5), 12.5);
});

Deno.test("resolveMaxPlaySeconds uses default when null and enforces minimum window", () => {
  assertEquals(resolveMaxPlaySeconds(null), DEFAULT_MAX_PLAY_SECONDS);
  assertEquals(resolveMaxPlaySeconds(undefined), DEFAULT_MAX_PLAY_SECONDS);
  assertEquals(resolveMaxPlaySeconds(1), MIN_PLAYABLE_WINDOW_SECONDS);
  assertEquals(resolveMaxPlaySeconds(45), 45);
});

Deno.test("clampStartAndMaxToDuration fits clip inside file duration", () => {
  assertEquals(
    clampStartAndMaxToDuration(100, 60, 120),
    { playStartSeconds: 100, maxPlaySeconds: 20 },
  );
  assertEquals(
    clampStartAndMaxToDuration(118, 30, 120),
    {
      playStartSeconds: 120 - MIN_PLAYABLE_WINDOW_SECONDS,
      maxPlaySeconds: MIN_PLAYABLE_WINDOW_SECONDS,
    },
  );
});

Deno.test("parseTrackPlaybackFormFields treats empty strings as null", () => {
  const form = new FormData();
  form.set("playStartSeconds", "");
  form.set("maxPlaySeconds", "");
  assertEquals(parseTrackPlaybackFormFields(form), {
    ok: true,
    playStartSeconds: null,
    maxPlaySeconds: null,
  });
});

Deno.test("parseTrackPlaybackFormFields rejects max below minimum window", () => {
  const form = new FormData();
  form.set("maxPlaySeconds", "1");
  assertEquals(parseTrackPlaybackFormFields(form), { ok: false });
});

Deno.test("parseTrackPlaybackFormFields rejects negative start", () => {
  const form = new FormData();
  form.set("playStartSeconds", "-1");
  assertEquals(parseTrackPlaybackFormFields(form), { ok: false });
});
