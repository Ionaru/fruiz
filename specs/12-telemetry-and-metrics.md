# 12 — Telemetry and metrics

> Operational observability for `fruiz` over OpenTelemetry: distributed traces,
> metrics, and logs. The runtime and framework emit request, render, and
> HTTP-metric signals for free once an exporter is enabled; a thin server-side
> layer adds domain spans and counters for quiz, audio, auth, and moderation
> work. Backend-agnostic OTLP, and a no-op when disabled.

## Purpose

This subsystem owns **operational telemetry** across the three OpenTelemetry
signal types — traces, metrics, and logs — for the running application and its
batch/CLI processes. It defines how telemetry is enabled, how signals are named
and scoped, and what those signals may and may not carry.

It is explicitly **not** responsible for:

- The request/session plumbing itself — that lives in
  `10-sessions-and-request-lifecycle.md`; this spec only observes it.
- A structured-logging replacement for the plain per-request log line — that is
  the "Structured logging" item in `90-roadmap.md`. Until it lands, console
  output is captured as OpenTelemetry logs by the baseline (below).
- Product/player-behaviour analytics. Only operational signals (latency,
  throughput, outcomes, errors) are in scope.

## Behavior

### Baseline auto-instrumentation (environment-only, no application code)

- **Enable flag.** Given `OTEL_DENO=true` and a reachable exporter, the baseline
  is active. When the flag is unset, all instrumentation is a no-op with no
  measurable cost.
- **Runtime traces and metrics.** When enabled, the runtime emits traces for
  every incoming HTTP request, every outgoing `fetch`, and every scheduled job;
  HTTP server metrics for request duration, in-flight request count, and
  request/response body sizes; and forwards `console.*` output as log records.
- **Framework spans.** The framework adds child spans for middleware execution,
  route-handler execution, server-side rendering (including async components),
  static-file serving, and lazy route loading. The root request span carries the
  **matched route pattern** (for example `GET /quiz/:category/:slug`) so traces
  group by route rather than by raw URL.
- **Error capture.** Given an exception is thrown in a handler or during
  rendering, Then it is recorded on the active span and the span status is set
  to error.
- **Client correlation.** When an exporter is active, a W3C `traceparent` meta
  tag is injected into the rendered page head so browser-side instrumentation
  can link client spans back to the server render.

### Custom domain instrumentation

- **One helper, one tracer, one meter.** A single server-only telemetry helper
  exposes the application's named tracer and meter plus a span wrapper and
  counter/histogram factories. Domain code calls those helpers and never touches
  an exporter or SDK directly.
- **No-op contract.** The helper MUST be a safe no-op when no exporter is
  configured: acquiring the tracer/meter and opening spans or instruments
  succeeds and does nothing observable, so call sites need no `if (enabled)`
  guards.
- **Augment, never duplicate.** Custom signals describe sub-operations the
  runtime cannot name (deterministic track selection, audio loudness analysis)
  and domain outcomes the runtime cannot see (quiz created vs reused, guess
  matched, suggestion decision). They never re-time what the baseline already
  times (the HTTP request).
- **Client-only outcomes are reported through a dedicated sink.** Guess scoring
  happens in the browser, so the player UI reports each guess's match result to
  a small fire-and-forget server endpoint that emits the guess counter. The
  outcome flag is the only thing sent; no answer text, track, or player identity
  crosses the wire, and no telemetry code enters the client bundle.
- **Passkey outcomes capture what the host sees.** WebAuthn ceremony
  verification is performed by the passkey layer before the host's
  identity/session hook runs, so the authentication counter records the
  host-visible outcomes — a successful login and the rejection of a credential
  whose user no longer exists — not cryptographic-verification failures handled
  upstream.

### Configuration

- Behaviour is driven entirely by **standard OpenTelemetry environment
  variables**; this subsystem introduces no bespoke telemetry config surface.
  Relevant variables: the enable flag (`OTEL_DENO`), service name
  (`OTEL_SERVICE_NAME`), exporter endpoint (`OTEL_EXPORTER_OTLP_ENDPOINT`),
  protocol (`OTEL_EXPORTER_OTLP_PROTOCOL`), authentication headers
  (`OTEL_EXPORTER_OTLP_HEADERS`), resource attributes
  (`OTEL_RESOURCE_ATTRIBUTES`), and console-capture mode (`OTEL_DENO_CONSOLE`).
- The default export is OTLP `http/protobuf` to a local collector endpoint; a
  deployment repoints the endpoint at any OTLP-compatible collector. The choice
  of trace/metric/log backend is out of scope and lives entirely in that
  collector — the application stays vendor-neutral.
- Local development sets the traces exporter to the console
  (`OTEL_TRACES_EXPORTER=console`) to print spans to standard error without a
  collector.

### Edge cases

- **Short-lived processes.** Batch and CLI runs may exit before a batching
  exporter flushes. Such a process MUST flush and shut down the telemetry
  provider before exiting, or its spans and metrics are lost.
- **Disabled path.** With the enable flag unset no provider is registered;
  helper calls resolve to no-op implementations and add no latency or allocation
  on request hot paths.
- **High volume.** High request volume yields high span volume — the runtime
  samples everything (see risks). Cardinality is held down by restricting
  attributes to the low-cardinality dimensions listed under Data model.

## Data model

Telemetry owns **signal contracts**, not database tables. Counts and durations
are derived signals and add no persisted state.

- **Resource attributes.** Every emitted signal identifies the service by a
  service name of `fruiz` plus the running build/version.
- **Naming conventions.** Span names are dotted, lowercase phrases (for example
  `quiz.select_tracks`). Custom metric names use the `fruiz.<domain>.<name>`
  form. Where a signal matches an OpenTelemetry semantic convention (HTTP server
  metrics, the matched-route attribute), the convention name is used unchanged
  rather than re-coined.
- **Attribute discipline.** Attributes carry only low-cardinality, non-sensitive
  dimensions — category, difficulty, a boolean match result, an outcome enum, a
  decision enum. They MUST NOT carry free-text user input, any identifier that
  singles out a person, URLs that may embed secrets, or raw record contents.

Custom span/metric catalog (functional operation → signal → attributes):

| Operation                                                       | Signal(s)                                                          | Attributes                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Quiz materialized for the first time vs served from an instance | span; `fruiz.quiz.created` counter; `fruiz.quiz.cache_hit` counter | category, difficulty                                                           |
| Deterministic track selection for a quiz                        | span                                                               | category, difficulty, track count                                              |
| A player's guess is checked against the answer pool             | `fruiz.guess.submitted` counter                                    | matched (true/false)                                                           |
| Audio loudness analysis pass                                    | span; `fruiz.audio.loudness.duration` histogram (seconds)          | scope (clip-window/full-track)                                                 |
| Playback-gain backfill, per track                               | `fruiz.playback_gain.backfill.track` counter                       | outcome (cache-hit / measured / seeded / analysis-failed / missing-or-invalid) |
| A track is added to a player collection                         | `fruiz.collection.track_added` counter                             | category                                                                       |
| A track suggestion is submitted                                 | `fruiz.suggestion.created` counter                                 | category                                                                       |
| A track suggestion is reviewed                                  | `fruiz.suggestion.reviewed` counter                                | decision (approved/denied)                                                     |
| Passkey registration completes                                  | `fruiz.auth.passkey.registered` counter                            | outcome (success/failure)                                                      |
| Passkey authentication completes                                | `fruiz.auth.passkey.authenticated` counter                         | outcome (success/failure)                                                      |

## Key components

Functional roles only; this subsystem deliberately names no implementation
paths.

- **The application HTTP server** — auto-instrumented for request traces and
  HTTP server metrics; the unit every request trace is rooted on.
- **The framework's automatic span coverage** — middleware, handler, render, and
  static-serving spans, plus the browser trace-context propagation tag.
- **The server-only telemetry helper** — owns the single application tracer and
  meter and the span/counter/histogram factories, and guarantees the
  no-op-when-disabled contract. It is the only module domain code imports for
  telemetry.
- **The runtime environment configuration** — supplies the standard
  OpenTelemetry variables that enable and route export; no telemetry
  configuration lives in application code.
- **The instrumented domain operations** — quiz materialization and selection,
  guess checking, audio loudness analysis and playback-gain backfill, collection
  updates, suggestion submit/review, and passkey ceremonies — each emitting the
  signals in the catalog.

## Constraints and invariants

- **Server-first (Principle II).** All instrumentation runs server-side — in
  request handling, server libraries, and batch/CLI processes. Telemetry code
  and the telemetry helper MUST NOT be imported into client/island bundles. No
  span or metric attribute may carry credential material, session cookies,
  passkey data, raw database records, or personally identifying information;
  attributes are restricted to the low-cardinality dimensions above. Request
  traces identify work by matched route pattern, never by a value that singles
  out a user.
- **Determinism unaffected (Principle I).** Spans and metrics added around quiz
  materialization and track selection MUST NOT change which tracks are selected
  or their order. Telemetry observes the deterministic pipeline; it is never an
  input to it.
- **Performance — no-op when disabled.** With no exporter configured the
  OpenTelemetry API path is a documented no-op; the helper MUST preserve this —
  cheap tracer/meter acquisition and no added per-request allocation or
  branching when telemetry is off. Instrumentation observes; it never alters
  application behaviour or results.
- **Verification mandatory (Principle V).** The helper is pure enough to
  unit-test for its no-op-when-disabled contract and instrument shape; runtime
  emission is validated manually against the console exporter.

## Verification approach

- **Unit:** with no SDK registered, acquiring the tracer/meter, opening and
  closing spans, and incrementing counters all succeed and raise no error —
  confirming the no-op contract and the helper's span/counter shape.
- **Manual:** run with the enable flag set and the traces exporter pointed at
  the console; load the home page and start a quiz, and confirm the root request
  span carries the matched-route attribute and that the custom quiz span and
  `fruiz.quiz.*` counters appear. Run the playback-gain backfill and confirm
  `fruiz.playback_gain.backfill.track` increments per outcome. Then run with the
  flag unset and confirm no spans are emitted and request latency is unchanged.
- **Collector (optional):** point the OTLP endpoint at a local collector and
  confirm traces, the HTTP server metric histograms, and `console.*`-derived
  logs all arrive under the `fruiz` service name.

## Decisions and known risks

- **Decision — runtime is stable.** Deno's OpenTelemetry integration is stable
  in the deployed runtime; no `--unstable-*` flag is required. Deployments
  enable telemetry through the standard OpenTelemetry environment variables
  alone.
- **Decision — sampling.** The runtime's sample-all behaviour is accepted; no
  application-level head sampler is introduced. Volume is not a concern at the
  expected request rate, and any further volume/cost control stays at the
  collector tier.
- **Decision — request logger is removed.** The framework's per-request spans
  supersede the plain per-request log line described in
  `10-sessions-and-request-lifecycle.md`; that logger is dropped as part of this
  work. Per-request observability comes from the request span, and `console.*`
  output is still captured as OpenTelemetry logs. This change MUST also update
  `10-sessions-and-request-lifecycle.md` and the "Structured logging" item in
  `90-roadmap.md` in the same change.
- **Risk — PII / secret leakage in attributes.** The attribute allow-list is
  review-enforced; a careless attribute set with user input or a full URL would
  leak. Keep attributes to the catalog's low-cardinality dimensions.
- **Risk — exporter flush on short-lived processes.** Batch/CLI runs can exit
  before a batching exporter flushes, silently dropping their telemetry; each
  such process must explicitly flush and shut down the provider before exit.
