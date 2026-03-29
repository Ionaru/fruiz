# Research: Passkey registration and login

**Feature**: `004-passkey-auth` | **Date**: 2026-03-29

## 1. Discoverable passkey login (no username)

**Decision**: Use `generateAuthenticationOptions` with **no** `allowCredentials`
(or an empty list), `userVerification: "preferred"` (or `"required"` if stricter
UX is desired), so the browser can surface **resident** / **discoverable**
credentials. Registration MUST use `residentKey: "required"` and
`userVerification: "preferred"` (or `"required"`) so credentials are
discoverable.

**Rationale**: Matches FR-002 and product clarification; avoids username entry.

**Alternatives considered**:

- **Allow-credentials-only** (current `lib/auth.ts` style listing all DB
  credentials): works without resident keys but is not “pick user on device”
  discoverable UX and does not match spec.

## 2. Session storage vs signed cookie

**Decision**: Replace HMAC-signed cookie payload with **opaque UUID** session id
stored in **`sessions`** table; cookie holds only the id. Session row stores
`userId` and optional JSON blob for future session-scoped data.

**Rationale**: Matches FR-003, FR-004, FR-008; enables logout by deleting row;
aligns with “persist mutations in middleware.”

**Alternatives considered**:

- **Keep HMAC cookie**: fewer DB reads, but violates spec’s `sessions` table and
  complicates server-side invalidation and FR-008 persistence story.

## 3. Cookie handling (@std/http)

**Decision**: Use **`jsr:@std/http`** cookie APIs (e.g. `getCookies` /
`setCookie` from the std `cookie` submodule for this Deno release) to read the
session cookie on the request and append **`Set-Cookie`** on responses that need
rotation/clearing.

**Rationale**: Explicit product requirement; reduces hand-rolled cookie bugs.

**Alternatives considered**:

- **Manual string `Set-Cookie`**: current code in `sessionCookieHeader`; migrate
  away for new session cookie while preserving attribute rules (HttpOnly,
  SameSite=Strict, Secure when `FRUIZ_SECURE_COOKIES=1` or equivalent dev flag).

## 4. Unified users and admin flag

**Decision**: Introduce **`users`** (or rename from `admin_users`) with `admin`
boolean. **`passkeys.userId`** references **`users.id`**. Existing `admin_users`
rows migrate to `users` with `admin = true`.

**Rationale**: FR-006 and spec clarifications; one account type.

**Alternatives considered**:

- **Separate `admin_users` and `users`**: duplicates passkey binding and breaks
  “admin same as regular user.”

## 5. WebAuthn challenge storage

**Decision**: **Retain in-memory `Map`** for challenge IDs in v1 (same pattern
as current `lib/auth.ts`), with a short TTL.

**Rationale**: Constitution allows proportional complexity; app is single-node
today; fastest path.

**Alternatives considered**:

- **SQLite challenges table**: better for horizontal scale; defer until needed.

## 6. Session middleware order vs static files

**Decision**: Register **`staticFiles()`** first (or keep existing order), then
the **session** middleware **immediately after**. Session middleware no-ops or
fast-paths pure static requests so DB work is skipped where cheap; for HTML and
API routes it is still the **first** layer that hydrates **`ctx.state`** from
the session cookie (aligned with updated `spec.md` Constitution wording).

**Rationale**: FR-008 without paying session lookup on every asset byte.

**Alternatives considered**:

- **Session before static**: fewer static hits but unusual for Fresh; not
  required.
- **Session on every request including static**: simplest, more DB load.

## 7. Admin route login UX

**Decision**: **`/admin/*`** requires authenticated session **and**
`user.admin`. Unauthenticated users redirect to **public login** (e.g.
`/account` or dedicated `/login`) rather than legacy `/admin/login` that assumes
admin-only passkey list—**or** keep `/admin/login` as thin redirect to global
login. Remove “register passkey by raw admin user id” from primary UX; account
management covers passkey add.

**Rationale**: Spec says admin assignment is out of app; public registration is
for everyone.

**Alternatives considered**:

- **Keep `/admin/login` + AdminForms as primary**: conflicts with discoverable
  global login and public registration.
