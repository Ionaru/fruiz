import { assert, assertEquals } from "@std/assert";
import {
  audioLoudnessDuration,
  guessSubmittedCounter,
  withSpan,
} from "../../../src/lib/telemetry.ts";

// With no OTEL provider registered (OTEL_DENO unset under `deno test`), every
// telemetry call must succeed and do nothing observable — no `if (enabled)`
// guards at call sites.
Deno.test("withSpan returns the callback result (async)", async () => {
  const value = await withSpan("test.async", () => Promise.resolve(42));
  assertEquals(value, 42);
});

Deno.test("withSpan returns the callback result (sync) and passes the span", async () => {
  let sawSpan = false;
  const value = await withSpan("test.sync", (span) => {
    sawSpan = typeof span.setAttribute === "function";
    return "ok";
  }, { category: "movies", difficulty: "easy" });
  assertEquals(value, "ok");
  assert(sawSpan);
});

Deno.test("withSpan re-throws and does not swallow errors", async () => {
  let threw = false;
  try {
    await withSpan("test.throws", () => {
      throw new Error("boom");
    });
  } catch (error) {
    threw = error instanceof Error && error.message === "boom";
  }
  assert(threw);
});

Deno.test("counters and histograms are no-ops when disabled", () => {
  guessSubmittedCounter.add(1, { matched: true });
  audioLoudnessDuration.record(0.5, { scope: "full-track" });
  // Reaching here without throwing is the assertion.
  assert(true);
});
