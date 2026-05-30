# 08 — Account authentication and passkeys

> Public passkey registration (username + first passkey), discoverable passkey
> login (no username typed), DB-backed sessions, account management from the
> home page, and a boolean `users.admin` flag that gates `/admin/*`. No
> passwords are ever stored.

## Purpose

This subsystem owns:

- The `users`, `passkeys`, and `sessions` tables and the helpers that create /
  read / delete rows in them.
- The integration of the external `@ionaru/fresh-passkeys` plugin: the storage
  adapter for its port and the hooks that translate ceremony results into user,
  passkey, and session writes.
- The signed session cookie (`fruiz_session`, opaque UUID) and the request-time
  helpers that read / write / clear it.
- The `requireAdminSessionOrRedirect` helper that gates `/admin/*` on
  `users.admin === true`.
- The account management UI: the `/account` hub, `/account/login`,
  `/account/register`, the logout action, and self-service account deletion.

The session middleware that hydrates `ctx.state.session` on every request lives
in spec 10. Admin CRUD that the admin gate protects lives in spec 09.

## Plugin boundary

The WebAuthn ceremonies themselves — option generation and signature
verification, single-use challenge storage, and credential counter updates —
live in the `@ionaru/fresh-passkeys` package. Fruiz wires it in at app boot and
supplies two things:

- **A storage adapter** that persists challenges, credentials, and counter
  bumps. The adapter keeps the challenge map in process memory (a known
  single-process limitation tracked in `90-roadmap.md`) and persists everything
  else via Drizzle.
- **Identity and session hooks.** A "current user id" reader for the
  authenticated add-passkey ceremony, an `onRegistered` hook that runs the
  atomic user + passkey + session transaction and sets the cookie, and an
  `onAuthenticated` hook that mints a session for an already-known user.
  Username validation also stays host-side.

The plugin registers a single dispatch middleware that serves the
`/api/auth/register-public`, `/api/auth/register-add-passkey`, and
`/api/auth/authenticate` endpoints. The host does not implement those routes
itself; the cookie, the user record, and the transaction live entirely in the
host through the hooks.

## Behavior

### Registration (public)

1. **Begin.** The host validates the username (trimmed length 3–24; the spec
   deliberately stops short of uniqueness and character-set rules — internal
   user ids distinguish accounts). The plugin generates a fresh provisional user
   id, requests a discoverable credential (`residentKey: "required"`,
   `userVerification: "preferred"`), and stores the challenge entry for **5
   minutes** under a single-use challenge id.
2. **Finish.** The plugin reads-and-deletes the challenge (TTL enforced) and
   verifies the attestation. On success it hands the verified credential to the
   host, which runs one synchronous Drizzle transaction inserting the `users`
   row (admin: false), the `passkeys` row, and an active `sessions` row, then
   sets the session cookie.

### Discoverable login

1. **Begin.** If no passkeys are registered at all the begin endpoint refuses,
   so the UI can surface a "no passkeys" message without launching the prompt.
   Otherwise the plugin produces authentication options with no
   `allowCredentials` — the browser surfaces a device picker over resident
   credentials — and stores a 5-minute challenge.
2. **Finish.** The plugin looks up the asserted credential, validates the
   assertion against the stored public key and counter, and updates the counter
   to the new value to keep replay detection valid. It then hands the resolved
   user id to the host.
3. **Session creation.** The host re-checks that the user row still exists
   (verifying the ceremony is not enough to log in — an orphaned credential
   whose user is gone must not mint a session), deletes any prior session that
   arrived on the request, inserts a new `sessions` row with
   `expires_at = now + 7 days`, and sets the cookie.

### Add a second passkey

The authenticated "add passkey" ceremony excludes the user's existing
credentials so the same device cannot re-register itself, and re-checks that the
challenge's bound user id matches the authenticated caller before persisting the
new credential. There is no maximum number of passkeys per account.

### Logout

The logout endpoint deletes the session row (guests no-op) and appends a
`max-age=0` `fruiz_session` cookie with the same attributes the live cookie
carries (`HttpOnly`, `SameSite=Strict`, `Secure` when
`FRUIZ_SECURE_COOKIES === "1"`). The logout control is rendered only on
`/account`, not on `/admin/*` — the admin shell deliberately has no logout
affordance so the logout path cannot be bypassed via the admin UI.

### Account deletion

A signed-in player can permanently delete their own account from `/account`. The
delete control requires an explicit confirmation step — clicking "Delete
account" opens a native browser confirmation dialog, and the request is only
sent if the player accepts — satisfying Principle IV's requirement that
destructive operations confirm before removing data. The
`POST /api/account/delete` endpoint requires an authenticated session (guests
receive a `401`), deletes the player's `users` row, and clears the
`fruiz_session` cookie with the same attributes logout uses. Deleting the
`users` row is sufficient to remove all of the player's data: `passkeys`,
`sessions`, and `collected_tracks` all carry an `onDelete: "cascade"` foreign
key on `users.id`, so the current session and every credential and collection
entry are removed in the same operation. On success the JSON caller is
redirected to the home page by the island; a non-JSON request receives a `302`
to `/`. Deletion is irreversible and, like losing every passkey, has no recovery
path.

### Admin gate

`requireAdminSessionOrRedirect`:

- Guest → redirect to `/account/login` (302).
- Logged-in non-admin user → redirect to `/account` (302).
- Logged-in admin → returns the admin route session.

The `admin` flag is read from the loaded `users` row on every request through
the session middleware. No long-lived stale admin access. The application
**never** assigns or revokes admin — provisioning happens out-of-band (SQL or a
setup script).

### Account hub

`/account` is the single management surface. Logged-in users see their username,
can add a second passkey, and can log out. Guests see entry points to register
and login. The home page links to this hub so SC-004 ("at most two clicks from
home") holds. `/account/login` and `/account/register` host the WebAuthn
islands.

Browser code reaches the plugin only through a small host-owned passkey client.
The islands never import `@simplewebauthn` or the plugin's client directly. The
client surface also rewrites two common WebAuthn failures into user-friendly
copy: a cancelled or timed-out OS prompt, and an attempt to add a passkey on a
device that already has one for the account. Other errors fall through with the
underlying message.

### Edge cases

- **Username validation failure:** the begin endpoint returns an error before
  any WebAuthn call so the user sees the message before they invoke their
  authenticator.
- **Challenge expired (5 minutes):** the finish endpoint surfaces a clear error
  and the user re-runs the flow.
- **Concurrent same-credential add:** `passkeys.credential_id` is unique on the
  schema; the second insert raises and the user is told to use the existing
  passkey.
- **Login with no registered passkeys:** the begin endpoint throws before any
  options are returned. The UI surfaces a "no passkeys" message.
- **Orphaned credential:** a `passkeys` row whose user has been deleted passes
  ceremony verification but is rejected by the session-minting hook with a 401,
  and no cookie is set.
- **Session expired:** the session middleware deletes the expired row and treats
  the request as guest; the cookie is cleared on the outgoing response (spec
  10).
- **Admin flag flipped while logged in:** the next request loads the fresh
  `users.admin` value through the session middleware; the change takes effect
  immediately.

## Data model

- **`users`** — `id` (UUID), `username`, `admin` (boolean, default `false`),
  `created_at`.
- **`passkeys`** — `id`, `user_id` (FK, cascade delete), `credential_id`
  (unique), `public_key` (base64url string), `counter`, `transports` (JSON
  string array or `null`), `created_at`.
- **`sessions`** — `id` (UUID, also the cookie value), `user_id` (FK, cascade
  delete), `data` (optional JSON for session-scoped server state), `expires_at`,
  `created_at`, `updated_at`.

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
- **Verification alone never authorizes a session.** The authentication hook
  MUST re-check that the user row still exists before issuing a cookie.
- **Islands stay at arm's length from the plugin.** Browser code goes through
  the host's passkey client; the plugin and `@simplewebauthn` MUST NOT be
  imported from islands.

## Verification approach

- **Unit:** username validation; the in-memory challenge store's single-use read
  and TTL expiry; the friendly mapping of cancelled-prompt and
  already-registered errors.
- **Integration:** guest → redirect to login, logged-in non-admin → redirect to
  `/account`, logged-in admin → render; logout deletes the row and clears the
  cookie; account deletion removes the `users` row and cascades to the player's
  `passkeys`, `sessions`, and `collected_tracks`
  (`tests/integration/routes/account_delete_test.ts`).
- **Manual:**
  - Register a new account on a passkey-capable device; confirm the session
    cookie is set with the right attributes and the new `/account` page shows
    the username.
  - Add a second passkey; log out; log in with each passkey alternately five
    times.
  - Manually delete a real account's `users` row, then replay the login ceremony
    with the orphaned credential — the response MUST be a 401 and no cookie MUST
    be set.
  - Set `users.admin = 1` via SQL and confirm `/admin` renders; flip it back and
    confirm the next request redirects.
  - Confirm `/admin/*` pages have no logout control and `/account` does.

## Open questions and known risks

- **Challenge store is in-memory.** Single-process today; the adapter boundary
  makes a horizontally-scaled deploy a drop-in swap to a shared store (Redis, DB
  table). Tracked in `90-roadmap.md`.
- **Username uniqueness.** Intentionally not required. If duplicate usernames
  become a UX problem, add a check at registration _and_ a migration plan for
  existing duplicates.
- **No recovery path.** Losing every registered passkey is unrecoverable by
  design. Production deployments MUST allow operators to insert a new passkey
  row via SQL when a real user gets locked out.
- **No rate limiting.** Both the registration begin and the authentication begin
  endpoints are unauthenticated and could be abused. The deployment is expected
  to apply rate limiting at the edge.
- **`/admin/login` legacy route.** Kept as a thin entry point for the `/admin/*`
  flow; today it shares the public login UI. If kept indefinitely, fold it into
  `/account/login` and redirect.
