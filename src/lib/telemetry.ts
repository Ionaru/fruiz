/**
 * Server-only OpenTelemetry helper: the single application tracer + meter and
 * the custom span/counter/histogram instruments from spec 12's catalog. When no
 * exporter is configured (`OTEL_DENO` unset), `@opentelemetry/api` resolves to
 * no-op implementations, so every call here succeeds and does nothing — call
 * sites need no `if (enabled)` guards.
 *
 * MUST stay server-only: never import this from `src/islands/**` or
 * `src/components/**` (it would pull telemetry into the client bundle).
 */
import { metrics, type Span, SpanStatusCode, trace } from "@opentelemetry/api";

const SERVICE = "fruiz";

const tracer = trace.getTracer(SERVICE);
const meter = metrics.getMeter(SERVICE);

export type TelemetryAttributes = Record<string, string | number | boolean>;

/**
 * Runs `fn` inside an active span named `name`, records exceptions and sets the
 * span status to error on throw, and always ends the span. Returns whatever `fn`
 * returns (sync or async). Observation only — never alters `fn`'s result.
 */
export function withSpan<T>(
  name: string,
  fn: (span: Span) => T | Promise<T>,
  attributes?: TelemetryAttributes,
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    if (attributes) span.setAttributes(attributes);
    try {
      return await fn(span);
    } catch (error) {
      span.recordException(
        error instanceof Error ? error : new Error(String(error)),
      );
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}

// --- Custom instrument catalog (names are the spec contract) ---
export const quizCreatedCounter = meter.createCounter("fruiz.quiz.created");
export const quizCacheHitCounter = meter.createCounter("fruiz.quiz.cache_hit");
export const guessSubmittedCounter = meter.createCounter(
  "fruiz.guess.submitted",
);
export const collectionTrackAddedCounter = meter.createCounter(
  "fruiz.collection.track_added",
);
export const suggestionCreatedCounter = meter.createCounter(
  "fruiz.suggestion.created",
);
export const suggestionReviewedCounter = meter.createCounter(
  "fruiz.suggestion.reviewed",
);
export const passkeyRegisteredCounter = meter.createCounter(
  "fruiz.auth.passkey.registered",
);
export const passkeyAuthenticatedCounter = meter.createCounter(
  "fruiz.auth.passkey.authenticated",
);
export const backfillTrackCounter = meter.createCounter(
  "fruiz.playback_gain.backfill.track",
);

/** Wall-clock duration of one ffmpeg loudness pass, in seconds. */
export const audioLoudnessDuration = meter.createHistogram(
  "fruiz.audio.loudness.duration",
  { unit: "s" },
);
