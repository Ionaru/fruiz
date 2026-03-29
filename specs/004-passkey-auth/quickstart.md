# Quickstart: Passkey auth development

**Feature**: `004-passkey-auth` | **Date**: 2026-03-29 (updated after analysis)

## Baseline / CI (T001, T031)

- **Pre-implementation** (early March 2026): `deno task check` reported
  `deno fmt --check` drift across the repo (including specs and sample
  middleware).
- **Post-implementation** (2026-03-29): `deno task check` and `deno task test`
  pass on the updated tree.

## Prerequisites

- Deno with workspace imports (`deno.json`)
- SQLite DB URL used by `db/db.ts` (follow existing project env)
- Browser with passkey support (Windows Hello, platform authenticator, or
  security key)

## Environment

Align with existing auth env where possible:

| Variable               | Purpose                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| `FRUIZ_RP_ID`          | WebAuthn RP ID (e.g. `localhost`)                                 |
| `FRUIZ_RP_NAME`        | Display name                                                      |
| `FRUIZ_SESSION_SECRET` | Unused after DB-backed sessions (safe to leave unset in dev)      |
| `FRUIZ_SECURE_COOKIES` | Set `1` for **Secure** cookie in TLS/staging; omit for local HTTP |

## Database

Apply the current schema with:

```powershell
deno task db:sync
```

Session cookie name: **`fruiz_session`** (opaque UUID → `sessions.id`).

_Admin access_: create a user via `/account/register`, then set `admin = 1` on
that row in `users` (SQLite) if you need `/admin` access.

## Run app

```powershell
cd C:\Users\Jeroen\Projects\fruiz
deno task dev
```

## FR-000 regression (quiz identity)

After auth changes, confirm **manually** (or via existing tests):

- Shareable **`/quiz/...`** URLs still encode the same category/difficulty/seed
  rules as before.
- No accidental coupling between **session cookie** and quiz path generation in
  `lib/slug.ts`, `lib/categories.ts`, or quiz route handlers.

**T033 — FR-000 (quiz identity):** Pass — 2026-03-29. No changes to `/quiz/...`
handlers, `lib/slug.ts`, `lib/categories.ts`, or track/category selection logic
beyond global imports; quiz URL semantics unchanged.

---

## Registration / login API checks (T011, T017)

- **Invalid username (GET)**: `GET /api/auth/register-public?username=ab` →
  `400` JSON `{ "error": "…" }`.
- **Happy path**: complete island flow on `/account/register` → `201` from POST
  `register-public` and `Set-Cookie: fruiz_session=…`.
- **Login errors**: failed WebAuthn verify returns generic `{ "error": string }`
  bodies (no stack traces).

## Discoverable login options (T016)

Manual: call `GET /api/auth/authenticate` when at least one passkey exists; the
`options` object MUST NOT include a fixed non-empty `allowCredentials` list
(discoverable / resident UX). `@simplewebauthn/server` omits the field in this
configuration.

---

## SC-005 — Five alternating login pairs (manual)

After **two** passkeys exist on one account:

1. Log out (from **account management** only).
2. Log in with **passkey A** → log out → log in with **passkey B** (pair 1).
3. Repeat step 2 four more times for **five** consecutive A/B alternations
   **without** re-registration.
4. Record pass/fail: ______ Date: ______

**Procedure note (T034):** Use the five alternating pairs above after two
passkeys are registered on one account; operator records pass/fail and date in
this section.

---

## Edge-case validation (manual)

Map to `spec.md` **Edge Cases**:

| Edge case                  | How to validate (brief)                                             | Pass |
| -------------------------- | ------------------------------------------------------------------- | ---- |
| Expired / revoked session  | Wait past expiry or delete session row; open protected page → guest |      |
| Unknown session cookie id  | Set bogus cookie value; app stays guest, no 500                     |      |
| Concurrent browsers        | Log out in browser A; browser B session unchanged until its logout  |      |
| Add passkey fails mid-flow | User still logged in; no “second passkey complete” until verify OK  |      |
| Admin flag toggled         | After DB `admin` change, next request reflects new privilege        |      |

---

## Logout placement (FR-009)

- **Account management** is the **only** UI that submits **log out** for end
  users (including **admin** users).
- **Admin** pages must **not** show a logout button after migration (relocated
  from legacy admin header).

---

## Smoke checklist (manual)

1. **Register** new user with 3–24 char username; complete passkey; confirm
   session cookie set and home shows **account hub** entry (guest + logged-in
   paths per FR-007).
2. **Login** in fresh profile / after logout: discoverable only, no username.
3. **Account management**: add second passkey; run **SC-005** procedure above.
4. **Logout** from account management only; confirm protected pages see guest
   (**SC-006**); confirm **no** logout control remains on `/admin/*`.
5. **Admin**: user with `admin=false` denied `/admin`; with `admin=true` allowed
   (after DB flag set out of band).

## SC-001 (optional KPI)

Time one **cold** registration (open site → finish first passkey → see
authenticated state). Target **under 3 minutes** on a typical connection.
Record: 10s — Date: 2026-03-29

_Not a CI gate._ (T035 — optional KPI; record timing here when measured.)

## Mobile / viewport smoke (T032)

Exercise registration, login, account management, and admin allow/deny on a
**phone-sized** viewport; record pass in the PR or add a short note with date:
2026-03-29

## Automated checks

```powershell
deno task check
deno task test
```

Add tests alongside implementation per plan verification section.
