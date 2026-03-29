# Quickstart: Passkey auth development

**Feature**: `004-passkey-auth` | **Date**: 2026-03-29 (updated after analysis)

## Prerequisites

- Deno with workspace imports (`deno.json`)
- SQLite DB URL used by `db/db.ts` (follow existing project env)
- Browser with passkey support (Windows Hello, platform authenticator, or
  security key)

## Environment

Align with existing auth env where possible:

| Variable | Purpose |
| -------- | ------- |
| `FRUIZ_RP_ID` | WebAuthn RP ID (e.g. `localhost`) |
| `FRUIZ_RP_NAME` | Display name |
| `FRUIZ_SESSION_SECRET` | Legacy HMAC secret—**may become unused** after DB sessions; remove references when migrated |
| `FRUIZ_SECURE_COOKIES` | Set `1` for **Secure** cookie in TLS/staging; omit for local HTTP |

## Database

1. Update `db/schema.ts` with `users`, `sessions`, and `passkeys.user_id`.
2. Run project’s usual Drizzle push:
   - `deno task db:sync` (see `deno.json`)

3. **Data migration** (one-time): script or SQL to move `admin_users` → `users`,
   set `admin = true`, rewrite `passkeys.admin_user_id` → `user_id`.

## Run app

```powershell
cd C:\Users\Jeroen\Projects\fruiz
deno task dev
```

## FR-000 regression (quiz identity)

After auth changes, confirm **manually** (or via existing tests):

- Shareable **`/quiz/...`** URLs still encode the same category/difficulty/seed
  rules as before.
- No accidental coupling between **session cookie** and quiz path generation
  in `lib/slug.ts`, `lib/categories.ts`, or quiz route handlers.

_Record “pass” and date here during implementation (task T033)._

---

## SC-005 — Five alternating login pairs (manual)

After **two** passkeys exist on one account:

1. Log out (from **account management** only).
2. Log in with **passkey A** → log out → log in with **passkey B** (pair 1).
3. Repeat step 2 four more times for **five** consecutive A/B alternations
   **without** re-registration.
4. Record pass/fail: ______ Date: ______

---

## Edge-case validation (manual)

Map to `spec.md` **Edge Cases**:

| Edge case | How to validate (brief) | Pass |
| --------- | ------------------------ | ---- |
| Expired / revoked session | Wait past expiry or delete session row; open protected page → guest | |
| Unknown session cookie id | Set bogus cookie value; app stays guest, no 500 | |
| Concurrent browsers | Log out in browser A; browser B session unchanged until its logout | |
| Add passkey fails mid-flow | User still logged in; no “second passkey complete” until verify OK | |
| Admin flag toggled | After DB `admin` change, next request reflects new privilege | |

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
5. **Admin**: user with `admin=false` denied `/admin`; with `admin=true`
   allowed (after DB flag set out of band).

## SC-001 (optional KPI)

Time one **cold** registration (open site → finish first passkey → see
authenticated state). Target **under 3 minutes** on a typical connection.
Record: ______ s — Date: ______

_Not a CI gate._

## Automated checks

```powershell
deno task check
deno task test
```

Add tests alongside implementation per plan verification section.
