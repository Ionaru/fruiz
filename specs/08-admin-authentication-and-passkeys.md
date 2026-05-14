# 08 — Account authentication and passkeys

> Public passkey registration (username + first passkey), discoverable passkey
> login (no username typed), DB-backed sessions, account management from the
> home page, and a boolean `users.admin` flag that gates `/admin/*`. No
> passwords are ever stored.

## Purpose

This subsystem owns:

- The `users`, `passkeys`, and `sessions` tables and the helpers that create /
  read / delete rows in them.
- WebAuthn ceremonies for public registration, adding a second passkey, and
  discoverable login.
- The signed session cookie (`fruiz_session`, opaque UUID) and the request-time
  helpers that read / write / clear it.
- The `requireAdminSessionOrRedirect` helper that gates `/admin/*` on
  `users.admin === true`.
- The account management UI: `/account` hub, `/account/login`,
  `/account/register`, and the logout action.

The session middleware that hydrates `ctx.state.session` on every request lives
in spec 10. Admin CRUD that the admin gate protects lives in spec 09.

## Behavior

### Registration (public)

[`src/routes/api/auth/register-public.ts`](../src/routes/api/auth/register-public.ts)
implements the two-step ceremony.

1. **Begin (`beginPublicRegistration(username)`):**
   - Validate the username with `validateUsername`: trimmed length must be 3–24
     characters. The spec deliberately stops short of uniqueness and
     character-set rules — internal user ids distinguish accounts.
   - Generate a `pendingUserId` (UUID) used as the WebAuthn `user.id` byte
     array.
   - Call `@simplewebauthn/server.generateRegistrationOptions` with
     `residentKey: "required"` and `userVerification: "preferred"`.
   - Store the challenge entry (challenge string, expiry, pending user id,
     username) in the in-memory `challenges` map under a UUID `challengeId`. TTL
     is **5 minutes**.
2. **Finish
   (`verifyPublicRegistration(challengeId, credential,
   expectedOrigin)`):**
   - `takeChallenge` reads-and-deletes the entry (single-use) and enforces TTL.
   - `verifyRegistrationResponse` checks the attestation. Failure throws.
   - Extract `credentialId`, `publicKey`, `counter`, and `transports` from the
     verification result. Both binary values are base64url encoded.
3. **Persist (`insertUserPasskeyAndSession`** in
   [`src/lib/completeRegistration.ts`](../src/lib/completeRegistration.ts)
   **):**
   - One synchronous Drizzle transaction inserts the `users` row (admin: false),
     the `passkeys` row, and an active `sessions` row.
   - Returns the new `sessionId` for the response handler to `Set-Cookie` via
     `appendSessionCookie`.

### Discoverable login

[`src/routes/api/auth/authenticate.ts`](../src/routes/api/auth/authenticate.ts)
implements two stages.

1. **Begin (`beginAuthentication`):**
   - Refuses if no passkeys are registered in the DB (no possible login).
   - Generates
     `generateAuthenticationOptions({ userVerification:
     "preferred" })`
     with no `allowCredentials` — the browser surfaces a device picker over
     resident credentials.
   - Stores the challenge with a 5-minute TTL.
2. **Finish (`finishAuthentication`):**
   - Looks up the asserted `credentialId` via Drizzle (`passkeys` with
     `with: { user: true }`).
   - `verifyAuthenticationResponse` validates the assertion against the stored
     public key and current counter.
   - On success, updates `passkeys.counter` with the new counter to keep replay
     detection valid.
   - Returns `{ userId, username, admin }`.
3. **Session creation:** `createDbSession(userId)` inserts a `sessions` row with
   a `crypto.randomUUID()` id and `expiresAt = now + 7 days`.
   `appendSessionCookie` attaches it.

### Add a second passkey

[`src/routes/api/auth/register-add-passkey.ts`](../src/routes/api/auth/register-add-passkey.ts)
implements the authenticated "add passkey" ceremony.

1. **Begin (`beginAddPasskey(userId)`):**
   - Looks up the existing user; rejects unknown ids.
   - Builds `excludeCredentials` from the user's current passkeys so the same
     device can't re-register itself.
   - Stores the challenge with `addPasskeyUserId` populated.
2. **Finish (`verifyAddPasskey`):**
   - Re-verifies that the challenge's `addPasskeyUserId` matches the
     authenticated caller (defense against challenge swap).
   - Inserts the new `passkeys` row.

There is no maximum number of passkeys per account.

### Logout

[`src/routes/api/auth/logout.ts`](../src/routes/api/auth/logout.ts):

1. Reads the current session id from `ctx.state.session.id`. Guests no-op (the
   cookie clear is still appended for cleanup).
2. `deleteDbSession(sessionId)` removes the row.
3. `appendClearSessionCookie` writes a `max-age=0` cookie with the same
   attributes the live cookie carries (`HttpOnly`, `SameSite=Strict`, `Secure`
   when `FRUIZ_SECURE_COOKIES === "1"`).
4. The control is rendered only on `/account`, not on `/admin/*`. The admin
   shell deliberately has no logout affordance so the logout path cannot be
   bypassed via the admin UI.

### Admin gate

[`src/lib/adminSession.ts`](../src/lib/adminSession.ts):

```ts
requireAdminSessionOrRedirect(ctx);
```

- Guest → redirect to `/account/login` (302).
- Logged-in non-admin user → redirect to `/account` (302).
- Logged-in admin → returns the `AdminRouteSession` object.

The `admin` flag is read from the loaded `users` row on every request (via the
session middleware). No long-lived stale admin access. The application **never**
assigns or revokes admin — provisioning happens out-of-band (SQL or a setup
script).

### Account hub

`/account` (handler in
[`src/routes/account/index.tsx`](../src/routes/account/index.tsx)) is the single
management surface. Logged-in users see their username, can add a second
passkey, and can log out. Guests see entry points to register and login. The
home page links to this hub through the `AccountTopNav` layout component so
SC-004 ("at most two clicks from home") holds.

`/account/login` and `/account/register` are dedicated routes that host the
WebAuthn islands (`AccountLogin`, `AccountRegistration`, `AccountManage`).

### Edge cases

- **Username validation failure:** the begin endpoint returns an error before
  any WebAuthn call so the user sees the message before they invoke their
  authenticator.
- **Challenge expired (5 minutes):** `takeChallenge` returns `null`; the finish
  endpoint surfaces a clear error and the user re-runs the flow.
- **Concurrent same-credential add:** `passkeys.credentialId` is unique on the
  schema; the second insert raises and the user is told to use the existing
  passkey.
- **Login with no registered passkeys:** `beginAuthentication` throws before any
  options are returned. The UI surfaces a "no passkeys" message.
- **Session expired:** `loadActiveSession` deletes the expired row and returns
  `null`. The session middleware then clears the cookie on the outgoing response
  (spec 10).
- **Admin flag flipped while logged in:** the next request loads the fresh
  `users.admin` value through the session middleware; the change takes effect
  immediately on the next request.

## Data model

[`src/db/schema.ts`](../src/db/schema.ts):

- **`users`** — `id` (UUID), `username`, `admin` (boolean, default `false`),
  `created_at`.
- **`passkeys`** — `id`, `user_id` (FK, cascade delete), `credential_id`
  (unique), `public_key` (base64url string), `counter`, `transports` (JSON
  string array or `null`), `created_at`.
- **`sessions`** — `id` (UUID, also the cookie value), `user_id` (FK, cascade
  delete), `data` (optional JSON for session-scoped server state), `expires_at`,
  `created_at`, `updated_at`.

Application types:

- `AuthenticatedUser` (`src/lib/auth.ts`) — return shape of
  `finishAuthentication`.
- `SessionUser`, `LoadedSession` (`src/lib/session.ts`) — session-load result.
- `AdminRouteSession` (`src/lib/adminSession.ts`).
- `VerifiedRegistration` (`src/lib/auth.ts`) — verification result shape passed
  to `insertUserPasskeyAndSession`.

## Key files

- **Server-only**
  - [`src/lib/auth.ts`](../src/lib/auth.ts) — challenge map, all WebAuthn
    ceremonies, username validation.
  - [`src/lib/session.ts`](../src/lib/session.ts) — cookie name, TTL, DB session
    CRUD, cookie read / append / clear.
  - [`src/lib/completeRegistration.ts`](../src/lib/completeRegistration.ts) —
    one-transaction registration writes.
  - [`src/lib/adminSession.ts`](../src/lib/adminSession.ts) — admin gate helper.
- **Routes**
  - [`src/routes/api/auth/register-public.ts`](../src/routes/api/auth/register-public.ts)
    — public registration (begin + finish).
  - [`src/routes/api/auth/register-add-passkey.ts`](../src/routes/api/auth/register-add-passkey.ts)
    — add-passkey ceremony.
  - [`src/routes/api/auth/register.ts`](../src/routes/api/auth/register.ts) —
    legacy admin-passkey route (kept for the `/admin/login` flow).
  - [`src/routes/api/auth/authenticate.ts`](../src/routes/api/auth/authenticate.ts)
    — discoverable login (begin + finish).
  - [`src/routes/api/auth/logout.ts`](../src/routes/api/auth/logout.ts) — delete
    session + clear cookie.
  - [`src/routes/account/index.tsx`](../src/routes/account/index.tsx),
    [`src/routes/account/login.tsx`](../src/routes/account/login.tsx),
    [`src/routes/account/register.tsx`](../src/routes/account/register.tsx) —
    account hub and entry pages.
  - [`src/routes/admin/login.tsx`](../src/routes/admin/login.tsx) — admin login
    redirect / shell.
- **Islands (client)**
  - [`src/islands/AccountLogin.tsx`](../src/islands/AccountLogin.tsx).
  - [`src/islands/AccountRegistration.tsx`](../src/islands/AccountRegistration.tsx).
  - [`src/islands/AccountManage.tsx`](../src/islands/AccountManage.tsx).
- **Components (SSR)**
  - [`src/components/account/AccountInfo.tsx`](../src/components/account/AccountInfo.tsx).
  - [`src/components/layout/AccountTopNav.tsx`](../src/components/layout/AccountTopNav.tsx).
- **Tests**
  - [`tests/unit/lib/auth_test.ts`](../tests/unit/lib/auth_test.ts) — username
    validation, challenge store TTL.
  - [`tests/integration/routes/admin_auth_test.ts`](../tests/integration/routes/admin_auth_test.ts)
    — full admin gate behavior across guest / non-admin / admin sessions.
  - [`tests/admin_gate_test.ts`](../tests/admin_gate_test.ts) — focused redirect
    behavior of `requireAdminSessionOrRedirect`.
  - [`tests/session_logout_test.ts`](../tests/session_logout_test.ts) — logout
    deletes the row and clears the cookie.

## Constraints and invariants

- **Principle IV — Passkey-secured authentication.** Passwords MUST NOT be
  introduced anywhere in this subsystem. Challenge verification (registration
  and login) and counter updates MUST be preserved.
- **Cookie attributes are not optional.** `HttpOnly` and `SameSite=Strict` are
  always set. `Secure` is set whenever `FRUIZ_SECURE_COOKIES === "1"` (set in
  any non-development deployment).
- **Session ids are opaque UUIDs.** The cookie value is the row's primary key;
  there is no HMAC payload to roll. Server-side row deletion is the only logout
  primitive that matters.
- **Admin is read, never written.** No application path may set `users.admin`.
  Operators flip the flag via SQL or a setup script outside the app.
- **Single source of admin truth.** `users.admin` is loaded fresh on every
  request through the session middleware (spec 10), not cached across requests.
- **Logout lives on `/account` only.** Admin pages MUST NOT expose a logout
  control.

## Verification approach

- **Unit:** `auth_test.ts` covers `validateUsername` and challenge TTL.
- **Integration:** `admin_auth_test.ts` exercises guest → redirect to login,
  logged-in non-admin → redirect to `/account`, logged-in admin → render.
  `session_logout_test.ts` exercises the cookie-clear path. `admin_gate_test.ts`
  covers `requireAdminSessionOrRedirect` directly.
- **Manual:**
  - Register a new account on a passkey-capable device; confirm the session
    cookie is set with the right attributes and the new `/account` page shows
    the username.
  - Add a second passkey; log out; log in with each passkey alternately five
    times.
  - Set `users.admin = 1` via SQL and confirm `/admin` renders; flip it back and
    confirm the next request redirects.
  - Confirm `/admin/*` pages have no logout control and `/account` does.

## Open questions and known risks

- **Challenge store is in-memory.** Single-process today; a horizontally-scaled
  deploy would need a shared store (Redis, DB table). Document in
  `90-roadmap.md`.
- **Username uniqueness.** Intentionally not required. If duplicate usernames
  become a UX problem, add a check at registration _and_ a migration plan for
  existing duplicates.
- **No recovery path.** Losing every registered passkey is unrecoverable by
  design. Production deployments MUST allow operators to insert a new passkey
  row via SQL when a real user gets locked out.
- **No rate limiting.** Both registration begin and authentication begin are
  unauthenticated and could be abused. The deployment is expected to apply rate
  limiting at the edge.
- **`/admin/login` legacy route.** Kept as a thin entry point for the `/admin/*`
  flow; today it shares the public login UI. If kept indefinitely, fold it into
  `/account/login` and redirect.
