# 90 — Roadmap

> Known future work and open risks. This is the only spec that is intentionally
> about things _not_ in the codebase yet. Promote items into the matching
> numbered spec as they land.

## Purpose

A single place to capture:

- Product features that are deliberately out of scope today but anticipated.
- Operational and security risks worth tracking before a public launch.
- Cross-cutting cleanups that affect multiple subsystems.

When a roadmap item is implemented, the description here MUST move into the
owning subsystem spec (and any cross-cutting note removed).

## Player-facing features

### Multiplayer rooms

Synchronized quiz rooms where a host streams the quiz and players answer in real
time. Likely to need:

- A new room identifier in the URL (`/room/<id>`) layered on top of the current
  `(category, difficulty, code)` triple from spec 02.
- A real-time channel (WebSocket or SSE) that broadcasts round transitions.
- Server-side authority over "who has answered what" so leaderboards are
  credible.

### Persistent leaderboards

Daily and category-scoped boards. Requires authenticated players (spec 08
already exists), a `results` table keyed by `(quizInstanceId,
userId)`, and an
aggregation job. Spec 07 (collections) already pays much of the schema cost —
extend that schema rather than parallel one.

### Daily challenge

A single fixed quiz per day, surfaced on the home page. Implementation is a
date-derived `code` per category. Stays inside spec 02's identity rules.

### Community submissions

Players propose tracks via a form; admins approve through the existing admin
panel (spec 09). Requires a `track_submissions` table and a moderation queue.

### Audio URL obfuscation

Today the listen route (spec 03) is unauthenticated and predictable. Before
public launch, audit whether players can pre-identify titles via network
inspection; if so, sign listen URLs with a short-lived HMAC over
`(trackId, expiry)` and validate at the route.

### Dynamic OG images

The quiz route serves a static image for social shares (spec 02). A future
enhancement renders per-quiz cards (`/og/{slug}.png`) with the category name,
difficulty, and code.

## Operational improvements

### Horizontal scale prerequisites

The current single-process server has two state stores that block horizontal
scale:

- **WebAuthn challenge map** (spec 08). The passkey plugin reaches its
  challenge store through a host-supplied adapter, so swapping the
  in-memory map for a shared store (Redis or a `challenges` table) is a
  drop-in implementation change rather than a rewrite. Required before
  running more than one server instance.
- **`AudioContext` lifecycle in islands** (spec 06). Module-scoped context
  survives client-side navigation; revisit if a SPA shell lands.

### Structured logging

Replace `loggerMiddleware` (spec 10) with a JSON-emitting logger that includes
request id, status, duration, and (where safe) authenticated user id. Redact
cookies.

### Rate limiting

Both `beginPublicRegistration` and `beginAuthentication` (spec 08) are
unauthenticated. The deployment is expected to apply edge-level rate limiting;
the application should not invent its own. Confirm the edge is in place before
launch.

### Audit log

Admin mutations (track create / edit / delete, category create / edit / delete)
are not logged today. Adding a write-only `audit_log` table plus middleware on
the admin route handlers would help with post-incident review.

## Code hygiene

### `State.shared` cleanup

`State.shared` (spec 10) is declared but unused. Either populate it
intentionally or remove it from the `State` interface. Tracked as a known nit.

### `/admin/login` legacy

The legacy `/admin/login` route (spec 08) overlaps with `/account/login`. Fold
one into the other and replace the legacy entry with a permanent redirect.

### Janitor for in-progress quiz keys

`InProgressQuizSection` (spec 04) scans `localStorage` for `fruiz-quiz:*` keys
without an expiry. Add a sweep that drops keys older than 90 days so the
home-page list stays short.

### Audio-file orphans

Deleting a `tracks` row (spec 09) does not remove the underlying audio file. The
disk footprint grows over time. A periodic janitor that identifies files in
`data/music/` not referenced by any `tracks` row would help, but it MUST handle
the race where a new track row is being inserted concurrently.

## Risks tracked but not yet mitigated

### Code-space size

Three-character `0–9A-Z` codes yield 36³ = 46 656 distinct quizzes per
`(category, difficulty)` pair (spec 02). Acceptable for now; if a category grows
past tens of thousands of curated quizzes the address space should be widened.

### Account recovery

Losing every registered passkey is unrecoverable by design (spec 08). Production
deployments must have an out-of-band way to insert a new passkey row for a real
user (e.g. an operator-only SQL playbook).

### Snapshot vs live audio

Quiz instances snapshot track titles (spec 02) but not audio paths. If an admin
replaces a track's audio file on disk, replayed quizzes hear the new clip. If
that becomes a content-integrity issue, capture `audio_url`, `playback_gain_db`,
and clip windowing in the snapshot table.
