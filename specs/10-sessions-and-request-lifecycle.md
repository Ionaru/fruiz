# 10 — Sessions and request lifecycle

> Cross-cutting plumbing: the Fresh app entry, the request middleware chain, the
> session-hydration / persistence pattern, and the shape of `ctx.state` that
> handlers read everywhere. Per-request observability is owned by telemetry
> (spec 12), not a dedicated logger.

## Purpose

This subsystem owns:

- The Fresh `App` instance and the order things are registered at boot.
- The `State` type that handlers and middleware share.
- The session middleware — cookie read, DB load, expiry touch,
  `ctx.state.session` hydration, and write-back on mutated `data`.
- Drizzle relations and the `DB` singleton.

The WebAuthn ceremonies and session CRUD helpers live in spec 08. The listen and
quiz routes are consumers of this lifecycle, defined in specs 02 / 03.

## Behavior

### Boot order

At app start the Fresh instance wires, in order:

1. `staticFiles()` — static assets short-circuit before any session work.
2. `trailingSlashes("never")` — `/foo/` redirects to `/foo` consistently so
   cookie paths and analytics keys do not split.
3. Session middleware applied **globally** — see below.
4. The passkey plugin's dispatch middleware — registers the
   `/api/auth/register-*` and `/api/auth/authenticate` endpoints (spec 08).
5. File-system routes — everything under `src/routes/`. The file-system
   middleware list carries no app-level logger; per-request traces come from the
   telemetry baseline (spec 12).

Session lives on a global app middleware rather than the file-system route
middleware list because the passkey plugin's endpoints are registered
programmatically and are not under the file-system route tree; they would
otherwise miss the session hydration.

### Session middleware

1. **Static-path skip.** Paths under `/@`, `/node_modules/`, `/_fresh/`,
   `/static/`, or with asset-style extensions
   (`.css .js .mjs .map .ico .png .jpg .jpeg .gif .svg .webp .woff(2)? .ttf .eot`)
   skip the DB load entirely. `ctx.state.session` is set to a guest slice and
   the handler chain proceeds.
2. **Cookie read.** The `fruiz_session` value is extracted. Absent → guest,
   proceed.
3. **DB load.** The session row is read with its `user` relation. Missing row OR
   missing user → guest. If the row has expired, it is deleted on the spot and
   the guest path is taken; the outgoing response gets a cookie clear so the
   stale browser cookie is removed.
4. **Hydration.** A successful load writes `{ id, user, data }` to
   `ctx.state.session` plus a snapshot of the initial `data` for later
   comparison.
5. **Expiry touch.** `expires_at` is extended to `now + 7 days` and `updated_at`
   is set. This implements a sliding-window expiry.
6. **Handler runs.**
7. **Persist mutations.** If the handler altered `ctx.state.session.data`, the
   middleware re-stringifies and writes the new JSON. The check is a cheap
   `JSON.stringify` comparison. Failures are swallowed so a serialization bug
   does not bring down the request.
8. **Cookie clear on unknown session.** When step 3 found no row, the middleware
   appends a `max-age=0` `fruiz_session` cookie to the outgoing response so the
   browser stops sending the stale id on subsequent requests.

### Per-request observability

There is no dedicated request logger. The telemetry baseline (spec 12) opens a
span per request carrying the matched route pattern, method, status, and
duration, superseding the old method-and-URL log line. `console.*` output is
still captured as OpenTelemetry logs until structured logging lands (spec 90).
Neither path records cookies or session ids.

### `ctx.state` shape

`State.session` is a small slice with three fields:

- `id` — the DB session id when logged in; `null` for guests or unknown cookies.
- `user` — `{ id, username, admin }` when logged in; `null` otherwise. The
  `admin` flag is hydrated each request from the `users` row, so admin grants
  and revocations take effect immediately.
- `data` — a mutable `Record<string, unknown>` persisted to `sessions.data` when
  the handler changes it.

Handlers and middlewares share the same `State` type through a single define
helper so `ctx.state` is consistent everywhere.

### DB singleton and relations

A singleton `db` is exported once and reused. Setting `FRUIZ_DEBUG=true` enables
Drizzle query logging. Relations are declared centrally so the relational query
API knows how to join. The authenticated joins relevant here are
`users → passkeys`, `users → sessions`, and `users → collected_tracks`, with
inverses on each side; other relations (`tracks ↔ categories`,
`quiz_instances → quiz_instance_tracks`, `collected_tracks → users`/`tracks`)
belong to other subsystems.

### Edge cases

- **Cookie present, unknown session id.** Treated as guest, with a cookie-clear
  appended so the browser stops sending the stale value.
- **Cookie present, expired session row.** Row deleted, guest path, cookie
  cleared.
- **Handler throws.** The session middleware never catches handler errors; it
  lets them propagate (Fresh's own error layer logs). Session writes happen
  after the handler returns, so on a thrown response mutated `data` is dropped —
  acceptable since the request failed.
- **Handler mutates `data` to an equivalent value.** The `JSON.stringify`
  comparison treats it as no-op; the DB is not written.
- **Static assets after deploy.** Skipping the session DB hit means static-asset
  latency does not depend on DB warmth.

## Data model

Relevant table: `sessions` (see spec 08). Shape:

| Column       | Type      | Notes                                                         |
| ------------ | --------- | ------------------------------------------------------------- |
| `id`         | text PK   | UUID; also the cookie value.                                  |
| `user_id`    | text FK   | → `users.id`, cascade delete.                                 |
| `data`       | text NULL | JSON-encoded `Record<string, unknown>`; `null` = `{}`.        |
| `expires_at` | timestamp | Sliding; bumped to `now + 7d` on every authenticated request. |
| `created_at` | timestamp | Audit.                                                        |
| `updated_at` | timestamp | Audit; bumped on every touch.                                 |

The `data` blob is intentionally narrow. Today it is unused; the mechanism
exists so handlers can stash transient server-scoped state (e.g. a CSRF-style
nonce or a multi-step admin wizard) without introducing a new table.

## Constraints and invariants

- **Principle II — Server-first data boundaries.** The session, cookie helpers,
  DB load, and relational queries all run in server-only modules. The browser
  never sees session JSON.
- **Principle IV — Passkey-secured authentication.** The cookie attributes
  (`HttpOnly`, `SameSite=Strict`, `Secure` outside dev), the 7-day TTL, and the
  sliding-window touch MUST be preserved.
- **Single hydration point.** Every authenticated route reads
  `ctx.state.session`. No handler is permitted to parse the cookie itself or
  query `sessions` directly. Adding a new mechanism (e.g. signed tokens) would
  mean adding a new middleware, not bypassing this one.
- **Session middleware is global.** It MUST cover both file-system routes and
  middleware-registered endpoints (the passkey plugin's dispatch); never
  re-scope it to just the file-system tree.
- **Static-path skip is an optimization, not a security boundary.** Static asset
  paths that bypass the session load also bypass admin checks; never put
  protected content under `/static/`.
- **Cookie clearing on unknown sessions** is mandatory. Without it, the browser
  keeps sending an unrecognized value on every request and the DB pays the cost
  of every miss.
- **Session `data` is small.** No bulk PII, no long-lived secrets. If a use case
  needs more, add a dedicated table instead of widening the blob.

## Verification approach

- **Integration:**
  - Confirm the cookie-clear path and the row deletion on logout.
  - Exercise guest → authenticated → admin transitions through the middleware.
  - Keep the import-direction rules honest (`components` never imports
    `islands`).
- **Manual:**
  - Request `/` and confirm `/_fresh/*` assets do not produce a session DB hit.
    With telemetry enabled (spec 12), confirm one request span per request; the
    old per-request log line is gone.
  - Login, then `DELETE FROM sessions` in SQL, then refresh — the response MUST
    include a cookie clear and the next request must be treated as guest.
  - Inspect `Set-Cookie` after a successful login; confirm
    `Path=/; HttpOnly; SameSite=Strict; Max-Age=604800` (and `Secure` when
    `FRUIZ_SECURE_COOKIES=1`).

## Open questions and known risks

- **In-memory challenge map.** Lives in the passkey plugin's storage adapter
  rather than in the session subsystem, but shares the same single-process
  constraint. Horizontal scale needs a shared challenge store — tracked
  alongside spec 08.
- **No structured application logs yet.** The dedicated request logger is
  removed in favour of telemetry request spans (spec 12); `console.*` is
  captured as OpenTelemetry logs but carries no structured fields or redaction.
  A JSON-emitting logger remains future work (Structured logging, spec 90).
- **`updated_at` precision.** The sliding-window touch bumps `expires_at` and
  `updated_at` on every authenticated request. If the application gets chatty,
  the write traffic could become significant; consider rate-limiting the touch
  to e.g. once per minute per session.
- **`State.shared`.** Currently unused outside type compatibility. Either
  populate it intentionally or remove it from `State` in a future change.
