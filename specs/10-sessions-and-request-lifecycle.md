# 10 — Sessions and request lifecycle

> Cross-cutting plumbing: the Fresh app entry, the request middleware chain, the
> session-hydration / persistence pattern, the request logger, and the shape of
> `ctx.state` that handlers read everywhere.

## Purpose

This subsystem owns:

- The Fresh `App` instance (`src/main.ts`).
- The `State` type that handlers and middleware share.
- The middleware list (`src/routes/_middleware.ts`).
- The session middleware (`src/middlewares/session.ts`) — cookie read, DB load,
  expiry touch, `ctx.state.session` hydration, and write-back on mutated `data`.
- The request logger middleware.
- Drizzle relations and the `DB` singleton.

The WebAuthn ceremonies and session CRUD helpers live in spec 08. The listen and
quiz routes are consumers of this lifecycle, defined in specs 02 / 03.

## Behavior

### Fresh app entry

[`src/main.ts`](../src/main.ts):

```ts
export const app = new App<State>();
app.use(staticFiles());
app.use(trailingSlashes("never"));
app.fsRoutes();
```

- `staticFiles()` is registered first so static assets short-circuit before any
  session work.
- `trailingSlashes("never")` redirects `/foo/` → `/foo` consistently so cookie
  paths and analytics keys do not split.
- `app.fsRoutes()` mounts the file-system router (`src/routes/`).

Build entry is `src/client.ts`; the Vite root is `src/`.

### Middleware chain

[`src/routes/_middleware.ts`](../src/routes/_middleware.ts) exports an ordered
array:

```ts
export default [sessionMiddleware, loggerMiddleware];
```

Order matters:

1. `sessionMiddleware` runs first so every handler that uses `ctx.state.session`
   has it populated.
2. `loggerMiddleware` runs after, so the log line accompanies the incoming
   request after session resolution has already touched the DB (or skipped it —
   see below).

### Session middleware

[`src/middlewares/session.ts`](../src/middlewares/session.ts):

1. **Static-path skip.** Paths under `/@`, `/node_modules/`, `/_fresh/`,
   `/static/`, or with asset-style extensions
   (`.css .js .mjs .map .ico .png .jpg .jpeg .gif .svg .webp .woff(2)?
   .ttf .eot`)
   skip the DB load entirely. `ctx.state.session` is set to a guest slice and
   the handler chain proceeds.
2. **Cookie read.** `readSessionCookie(ctx.req)` extracts the `fruiz_session`
   value via `@std/http`. Absent → guest, proceed.
3. **DB load.** `loadActiveSession(cookieVal)` reads the row with
   `with: { user: true }`. Missing row OR missing user → guest. If the row has
   expired, the row is deleted on the spot and the guest path is taken; the
   outgoing response gets an `appendClearSessionCookie` so the stale browser
   cookie is removed.
4. **Hydration.** Successful load writes:
   ```ts
   ctx.state.session = { id, user, data };
   ```
   plus a `structuredClone(loaded.data)` snapshot of the initial `data` for
   later comparison.
5. **Expiry touch.** `touchSessionExpiry(sessionId)` extends `expires_at` to
   `now + 7 days` (`SESSION_TTL_MS`) and sets `updated_at`. This implements a
   sliding-window expiry.
6. **Handler runs.** `await ctx.next()` produces a `Response`.
7. **Persist mutations.** If the handler altered `ctx.state.session.data`, the
   middleware re-stringifies and writes the new JSON via `persistSessionData`.
   The check is a cheap
   `JSON.stringify(after.data) !== JSON.stringify(initialData)`. Failures are
   swallowed so a serialization bug does not bring down the request.
8. **Cookie clear on unknown session.** When step 3 found no row, the middleware
   appends a `max-age=0` `fruiz_session` cookie to the outgoing response so the
   browser stops sending the stale id on subsequent requests.

### Logger middleware

A single `console.log(\`${method} ${url}\`)` call. Intentionally minimal so log
lines remain greppable without structured-logging overhead. Logs do not include
cookies or session ids.

### `ctx.state` shape

[`src/utils.ts`](../src/utils.ts):

```ts
interface SessionStateSlice {
  id: string | null; // DB sessions.id when logged in
  user: SessionUser | null; // hydrated each request
  data: Record<string, unknown>;
}

interface State {
  shared: string;
  session: SessionStateSlice;
}

export const define = createDefine<State>();
```

Handlers use `define.handlers({ async GET(ctx) { … } })` and middlewares use
`define.middleware(async (ctx) => { … })`. The shared `define` keeps the `State`
type consistent everywhere.

### DB singleton and relations

[`src/db/db.ts`](../src/db/db.ts) exports the singleton `db` and the `DB` type.
`FRUIZ_DEBUG=true` enables Drizzle query logging.

[`src/db/relations.ts`](../src/db/relations.ts) declares the relational schema
used by `db.query.<table>.findFirst|findMany`:

- `tracks ↔ categories` (many-to-many through `track_categories`).
- `users → passkeys`, `users → sessions`, `users → collected_tracks`, with
  inverses on each side.
- `quiz_instances → quiz_instance_tracks` (one-to-many).
- `collected_tracks → users`, `collected_tracks → tracks`.

### Edge cases

- **Cookie present, unknown session id.** Treated as guest, with a cookie-clear
  appended so the browser stops sending the stale value.
- **Cookie present, expired session row.** Row deleted, guest path, cookie
  cleared.
- **Handler throws.** The session middleware never catches handler errors; it
  lets them propagate (Fresh's own error layer logs). Session writes happen
  after `ctx.next()` completes, so on a thrown response, mutated `data` is
  dropped — acceptable since the request failed.
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

## Key files

- **Server-only**
  - [`src/main.ts`](../src/main.ts) — Fresh app entry.
  - [`src/utils.ts`](../src/utils.ts) — `State`, `SessionStateSlice`, `define`.
  - [`src/routes/_middleware.ts`](../src/routes/_middleware.ts) — middleware
    order.
  - [`src/middlewares/session.ts`](../src/middlewares/session.ts) — hydrate /
    persist.
  - [`src/middlewares/logger.ts`](../src/middlewares/logger.ts) — request log.
  - [`src/lib/session.ts`](../src/lib/session.ts) — cookie helpers, session
    CRUD, TTL constants (`SESSION_TTL_MS = 7 days`).
  - [`src/db/db.ts`](../src/db/db.ts) — singleton, `DB` type.
  - [`src/db/relations.ts`](../src/db/relations.ts) — relational schema.
- **Routes**
  - All `src/routes/**` consume `ctx.state.session`; none own it.
- **Tests**
  - [`tests/session_logout_test.ts`](../tests/session_logout_test.ts) —
    cookie-clear behavior, row deletion.
  - [`tests/integration/routes/admin_auth_test.ts`](../tests/integration/routes/admin_auth_test.ts)
    — session loading across admin redirects.
  - [`tests/integration/routes/composition_boundary_test.ts`](../tests/integration/routes/composition_boundary_test.ts)
    — enforces the import-direction rules (`components` never imports
    `islands`).

## Constraints and invariants

- **Principle II — Server-first data boundaries.** The session, cookie helpers,
  DB load, and relational queries all run in server-only modules. The browser
  never sees session JSON.
- **Principle IV — Passkey-secured authentication.** The cookie attributes
  (`HttpOnly`, `SameSite=Strict`, `Secure` outside dev), the 7-day TTL, and the
  sliding-window touch live in `src/lib/session.ts` and MUST be preserved.
- **Single hydration point.** Every authenticated route reads
  `ctx.state.session`. No handler is permitted to parse the cookie itself or
  query `sessions` directly. Adding a new mechanism (e.g. signed tokens) would
  mean adding a new middleware, not bypassing this one.
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
  - `session_logout_test.ts` confirms the cookie-clear path and the row
    deletion.
  - `admin_auth_test.ts` exercises guest → authenticated → admin transitions
    through the middleware.
  - `composition_boundary_test.ts` keeps the import-direction rules honest.
- **Manual:**
  - Tail the dev server log and request `/` — confirm a single log line per
    request and that `/_fresh/*` assets do not produce a session DB hit.
  - Login, then `DELETE FROM sessions` in SQL, then refresh — the response MUST
    include a cookie clear and the next request must be treated as guest.
  - Inspect `Set-Cookie` after a successful login; confirm
    `Path=/; HttpOnly; SameSite=Strict; Max-Age=604800` (and `Secure` when
    `FRUIZ_SECURE_COOKIES=1`).

## Open questions and known risks

- **In-memory challenge map (`src/lib/auth.ts`).** Not a _session_ store but
  lives in the same single-process scope. Horizontal scale needs a shared
  challenge store — flag this alongside spec 08.
- **Logging is `console.log` only.** No structured fields, no redaction.
  Production deployments should pipe stdout to a structured logger or replace
  this middleware with one that emits JSON.
- **`updated_at` precision.** The sliding-window touch bumps `expires_at` and
  `updated_at` on every authenticated request. If the application gets chatty,
  the write traffic could become significant; consider rate-limiting the touch
  to e.g. once per minute per session.
- **`State.shared`.** Currently unused outside type compatibility. Either
  populate it intentionally or remove it from `State` in a future change.
