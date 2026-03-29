# Implementation Plan: Passkey registration and login

**Branch**: `004-passkey-auth` | **Date**: 2026-03-29 | **Spec**:
[`spec.md`](./spec.md)\
**Input**: Feature specification from
`C:\Users\Jeroen\Projects\fruiz\specs\004-passkey-auth\spec.md`

## Summary

Deliver **public passkey registration** (username 3–24 chars + first passkey),
**discoverable passkey login** (no username), **DB-backed sessions** (UUID in
**HttpOnly** cookie, **SameSite=Strict**, **Secure** when not dev), and
**account management** from the home page (add passkeys without limit, **log
out** only here). **Admin** uses the same session: `users.admin === true` gates
`/admin/*`; the app **never** assigns admin in code.

**Technical approach**: Migrate `admin_users` + `passkeys` to a unified `users`
model, add a `sessions` table, replace the current HMAC cookie (`lib/auth.ts`)
with server-stored sessions, implement **first** Fresh middleware (`main.ts`) to
hydrate/persist `ctx.state`, extend **@simplewebauthn** flows for
resident/discoverable credentials, and add islands + routes for registration,
login, and account UI. Use **`@std/http`** cookie helpers for cookie
parse/serialize per spec.

## Technical Context

**Language/Version**: Deno (workspace `deno.json`), TypeScript\
**Primary Dependencies**: Fresh 2.x (`jsr:@fresh/core`), Preact,
`@preact/signals`, Drizzle ORM (SQLite), `@simplewebauthn/server` &
`@simplewebauthn/browser`, Tailwind CSS 4, Vite (`@fresh/plugin-vite`)\
**Storage**: SQLite via Drizzle (`db/schema.ts`, `db/db.ts`)\
**Testing**: `deno test -A tests/` (existing); add unit/integration tests
proportionally for auth/session paths per constitution\
**Target Platform**: Web (mobile-first); Fresh SSR + islands\
**Project Type**: Web application (single repo: `routes/`, `islands/`,
`components/`, `lib/`)\
**Performance Goals**: Standard single-instance quiz app; session lookup by
primary key (UUID); no new hard latency targets\
**Constraints**: Spec FR-004/FR-008/FR-009; constitution server-first,
signals-only islands, no passwords; quiz identity unchanged (FR-000)\
**Scale/Scope**: Single-node acceptable for WebAuthn **challenge store**
(current in-memory `Map` in `lib/auth.ts`); document limitation in `research.md`

## Constitution Check

_GATE: Passed for planning. Re-checked after Phase 1 design below._

- **Deterministic Quiz Identity**: **Unchanged**. Auth and sessions do not alter
  `/quiz/...` inputs or track ordering (FR-000).
- **Server-First Boundaries**: All verification, session persistence, and user
  lookup remain server-side. Islands only run WebAuthn client calls and minimal
  UI; handlers return only non-secret JSON (challenge handles, options).
- **Components Versus Islands**: New interactive auth/account UI in
  **`islands/`** with **`@preact/signals` only**—no `preact/hooks`. Layout/links
  on **`routes/`** / **`components/`** stay SSR-only.
- **Mobile-First Playability**: Registration, login, and account pages use
  full-width touch-friendly controls; passkey flows rely on OS sheets; no
  hover-only affordances.
- **Passkey-Secured Administration**: `/admin/*` continues to require a valid
  **session**; add explicit **`admin`** flag check on the loaded user.
  Destructive admin actions keep existing confirmation patterns.
- **Verification Plan**: Unit tests for session cookie helpers, username length,
  and admin gate; integration tests for session middleware + logout clearing DB
  row; manual mobile pass for registration/login/account + admin deny/allow.
- **Code Quality & Deno Gates**: `deno check` + `deno fmt --check` on touched
  scope; descriptive naming; shared auth/session helpers to avoid duplication.

### Post-design re-check

- Data model separates **users**, **passkeys**, **sessions**; no client exposure
  of session secrets.
- Contracts describe HTTP JSON surfaces only; no quiz payloads expanded.

## Project Structure

### Documentation (this feature)

```text
specs/004-passkey-auth/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   └── README.md
└── tasks.md             # /speckit.tasks (not created here)
```

### Source Code (repository root)

```text
main.ts                  # Session middleware right after staticFiles; load/save ctx.state
utils.ts                 # State interface (session + user snapshot)
db/schema.ts             # users, passkeys (userId), sessions
db/db.ts                 # Drizzle client (unchanged pattern)
lib/auth.ts              # WebAuthn + challenge store (refactor from admin-only)
lib/session.ts           # NEW: DB session CRUD, cookie name, dev secure flag
lib/adminSession.ts      # requireAdminSessionOrRedirect → session + admin flag
routes/index.tsx         # Link to account / auth entry
routes/account/          # NEW: management page, register/login entry as needed
routes/api/auth/        # register, authenticate, logout (+ optional session touch)
islands/                 # NEW or extended: AccountAuth island(s), signals-only
components/              # SSR buttons/layout only
```

**Structure Decision**: Single Fresh app as today. Feature adds
`routes/account/`, new `lib/session.ts`, schema migration, and refactors
`lib/auth.ts` away from HMAC cookies toward DB sessions + `@std/http` cookies.

**Middleware ordering**: Keep `staticFiles()` first if present for cheap asset
serving; register the **session** middleware **immediately after** it so session
DB work skips static requests but **session is still the first middleware that
hydrates `ctx.state`** for routes that need auth context (matches clarified
constitution wording in `spec.md`).

## Complexity Tracking

> No constitution violations requiring waiver.

## Phase 0 & 1 outputs

- **research.md**: WebAuthn discoverable login, cookie/session decisions,
  migration notes.
- **data-model.md**: Tables and fields.
- **contracts/README.md**: Auth API request/response shapes.
- **quickstart.md**: Env vars, migration, manual smoke steps.
