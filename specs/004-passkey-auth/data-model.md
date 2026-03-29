# Data model: Passkey registration and login

**Feature**: `004-passkey-auth` | **Date**: 2026-03-29\
**ORM**: Drizzle + SQLite (`db/schema.ts`)

## Entity: `users`

| Field        | Type            | Rules                                                                           |
| ------------ | --------------- | ------------------------------------------------------------------------------- |
| `id`         | text PK         | UUID default                                                                    |
| `username`   | text            | Required; length **3–24** (app validation only; no uniqueness required by spec) |
| `admin`      | integer/boolean | `0` / `1` or SQLite boolean; **read-only** in app for privilege                 |
| `created_at` | timestamp       | Required                                                                        |

**Relationships**: One user → many passkeys; one user → many sessions (typically
one active per browser).

**Migration**: Existing `admin_users` rows → `users` with `admin = true` (or
`1`). Preserve `id` where possible so passkey FK updates are local.

## Entity: `passkeys`

| Field           | Type      | Rules                                               |
| --------------- | --------- | --------------------------------------------------- |
| `id`            | text PK   | UUID default                                        |
| `user_id`       | text FK   | → `users.id`, **not null**, on delete cascade       |
| `credential_id` | text      | Unique (WebAuthn credential id encoding used today) |
| `public_key`    | text      | Base64url stored form (unchanged convention)        |
| `counter`       | integer   | WebAuthn signature counter                          |
| `transports`    | text?     | JSON string array or null                           |
| `created_at`    | timestamp | Required                                            |

**Rename**: `admin_user_id` → `user_id` (Drizzle migration + data copy).

## Entity: `sessions`

| Field        | Type      | Rules                                                              |
| ------------ | --------- | ------------------------------------------------------------------ |
| `id`         | text PK   | **UUID** = session id (also cookie value)                          |
| `user_id`    | text FK   | → `users.id`, **not null**, on delete cascade                      |
| `data`       | text?     | Optional JSON for session-scoped server state (start `{}` or null) |
| `expires_at` | timestamp | Required; sliding or absolute per `research.md` / implementation   |
| `created_at` | timestamp | Required                                                           |
| `updated_at` | timestamp | Optional; helps debugging                                          |

**Cookie**: HttpOnly name TBD (e.g. `fruiz_session`); value = `sessions.id`.

**Logout**: Delete row by id; clear cookie.

## Validation rules (app layer)

- **Username**: length 3–24 only (FR-001).
- **Session**: reject unknown/expired ids without error leakage; treat as guest.

## State transitions

- **Register**: Create `users` + `passkeys` + `sessions` in one coherent flow
  (transaction); set cookie.
- **Login**: Resolve passkey → user; create or rotate `sessions` row; set
  cookie.
- **Logout**: Delete `sessions` row; clear cookie.
- **Add passkey**: Authenticated user; insert `passkeys` row only.

## Drop / deprecate

- **`admin_users`**: Merged into `users` after migration.
- **HMAC session payload** in cookie: Removed in favor of UUID → `sessions`.
