---
description: "Task list for passkey registration, DB sessions, and admin gating"
---

# Tasks: Passkey registration and login

**Input**: Design documents from `C:\Users\Jeroen\Projects\fruiz\specs\004-passkey-auth\`\
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/README.md`, `quickstart.md`

**Tests**: Constitution requires proportional automated verification for auth,
sessions, and admin gates; include manual mobile steps where noted.

**Organization**: Phases follow user story priorities from `spec.md` (US1–US4).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallel-safe (different files, no ordering dependency within phase)
- **[USn]**: User story from `spec.md`
- Paths are relative to repo root `C:\Users\Jeroen\Projects\fruiz\`

## Phase 1: Setup (shared infrastructure)

**Purpose**: Baseline tooling and doc alignment before schema work.

- [ ] T001 Run `deno task check` on the current tree and record any pre-existing
      failures in `specs/004-passkey-auth/quickstart.md` (or confirm clean
      baseline).
- [ ] T002 [P] Re-read `specs/004-passkey-auth/contracts/README.md` and
      `specs/004-passkey-auth/research.md` and fix contract path names in that
      file if they still say `register-public` placeholders—implementation should
      match one consistent naming scheme.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Schema, DB sessions, middleware, and WebAuthn core refactors **must**
exist before user-story UI and routes behave correctly.

**⚠️ CRITICAL**: No user story phase starts until this phase completes.

- [ ] T003 Update `db/schema.ts`: add `users` and `sessions` per
      `specs/004-passkey-auth/data-model.md`; change `passkeys` to reference
      `users.id` (`user_id`); plan removal of `admin_users` after data migration.
- [ ] T004 Apply schema with `deno task db:sync` and run a one-time migration
      (script under `scripts/` or documented SQL) copying `admin_users` →
      `users` with `admin = 1` and rewriting `passkeys.admin_user_id` →
      `passkeys.user_id`.
- [ ] T005 Implement `lib/session.ts`: create/read/delete session rows; session
      cookie name; use `jsr:@std/http` cookie helpers for parse/serialize;
      **HttpOnly**, **SameSite=Strict**, **Secure** when `FRUIZ_SECURE_COOKIES`
      matches existing project convention.
- [ ] T006 Extend `utils.ts` `State` with session snapshot (user id, username,
      admin, session id) and a documented place for session-scoped mutable data
      that middleware persists per FR-008.
- [ ] T007 Add the **session** middleware in `main.ts` **immediately after**
      `staticFiles()` (or equivalent): load session cookie, hydrate `ctx.state`,
      `await ctx.next()`, then persist session mutations to `sessions`. No-op or
      fast-path when the request is for static assets only, per
      `specs/004-passkey-auth/plan.md` middleware ordering.
- [ ] T008 Refactor `lib/auth.ts` to use `users` / `passkeys`; registration with
      **resident** / discoverable credentials; `beginAuthentication` without a
      fixed credential allow-list; remove HMAC cookie session creation in favor
      of `lib/session.ts`.
- [ ] T009 Replace direct uses of `getSessionFromRequest` / HMAC session parsing
      with middleware-populated `ctx.state` (update call sites in
      `lib/adminSession.ts`, `routes/api/auth/*.ts`, and admin routes as needed).

**Checkpoint**: DB tables exist, session cookie is DB-backed, middleware sets
`ctx.state`, WebAuthn points at `users`.

---

## Phase 3: User Story 1 — Register with username and passkey (Priority: P1) 🎯 MVP core

**Goal**: Public registration with username length 3–24 and first passkey;
authenticated session after success; no orphaned user if passkey fails.

**Independent Test**: Complete registration on a passkey-capable browser; user
row + passkey + session exist; invalid username length rejected with clear
feedback.

### Verification for User Story 1

- [ ] T010 [P] [US1] Add unit tests for username length validation (3–24) in
      `tests/auth_username_test.ts` (or adjacent module under `tests/`).
- [ ] T011 [US1] Add handler/route tests or documented manual steps in
      `specs/004-passkey-auth/quickstart.md` for registration JSON API success and
      failure paths.

### Implementation for User Story 1

- [ ] T012 [US1] Implement public registration HTTP handlers under
      `routes/api/auth/` consistent with `specs/004-passkey-auth/contracts/README.md`
      (GET options + POST verify + Set-Cookie).
- [ ] T013 [US1] In `lib/auth.ts`, implement transactional **user + passkey +
      session** creation on successful registration verification.
- [ ] T014 [P] [US1] Add `routes/account/register.tsx` and
      `islands/AccountRegistration.tsx` using **@preact/signals** only (no
      `preact/hooks`).
- [ ] T015 [US1] Add from `routes/index.tsx` a clear **account hub** link (e.g.
      `/account`) so **guests** can reach register/login and **logged-in** users
      can reach management, satisfying FR-007 (see also T027/T028 for management
      UI).

**Checkpoint**: New visitors can register and land in an authenticated session.

---

## Phase 4: User Story 2 — Discoverable login without username (Priority: P1) 🎯 MVP core

**Goal**: Login using only the device passkey picker; no username field; same
session model as US1.

**Independent Test**: Log out, then log in with discoverable credential only;
session cookie restored.

### Verification for User Story 2

- [ ] T016 [P] [US2] Add automated test in `tests/` that inspects generated
      authentication options (no fixed allow-credentials list) OR document the
      exact assertion in `quickstart.md` for manual verification.
- [ ] T017 [US2] Add API/route test or manual checklist entry for login error
      bodies staying user-safe (no internal stack details).

### Implementation for User Story 2

- [ ] T018 [US2] Update `routes/api/auth/authenticate.ts` to use discoverable
      options, DB session creation, and `Set-Cookie` via `lib/session.ts` /
      `@std/http`.
- [ ] T019 [P] [US2] Add `routes/account/login.tsx` and
      `islands/AccountLogin.tsx` without a username input.

**Checkpoint**: US1 + US2 together form the minimal shippable auth loop.

---

## Phase 5: User Story 3 — Session and admin access (Priority: P2)

**Goal**: `/admin/*` requires valid session **and** `users.admin`; non-admin
authenticated users denied; unauthenticated redirected appropriately.

**Independent Test**: Non-admin session cannot use admin UI; admin session can;
guest redirected to login.

### Verification for User Story 3

- [ ] T020 [P] [US3] Add tests in `tests/admin_gate_test.ts` (or similar) for
      helper logic: guest, logged-in non-admin, logged-in admin.

### Implementation for User Story 3

- [ ] T021 [US3] Rewrite `lib/adminSession.ts` to require DB-backed session plus
      `admin === true` from authoritative user data.
- [ ] T022 [US3] Update `routes/admin/index.tsx`, `routes/admin/tracks/*.tsx`,
      and `routes/admin/categories/*.tsx` handlers to use the new guard (any
      file importing `requireAdminSessionOrRedirect`).
- [ ] T023 [US3] **Remove** any **Log out** form or button from **all**
      `routes/admin/**/*.tsx` layouts (FR-009); operators sign out only via
      **account management**. Replace legacy `routes/admin/login.tsx` +
      `islands/AdminForms.tsx` with redirect to `routes/account/login.tsx` (or
      remove client registration by raw admin user id).

**Checkpoint**: Admin surface matches FR-006 and constitution IV.

---

## Phase 6: User Story 4 — Account management, second passkey, logout (Priority: P2)

**Goal**: From home, reach account management in ≤2 steps when logged in; add
unlimited extra passkeys; logout **only** from account management; server
session cleared.

**Independent Test**: Add second passkey; alternate logins; logout from account
page; cookie cleared and DB session gone.

### Verification for User Story 4

- [ ] T024 [P] [US4] Add tests in `tests/session_logout_test.ts` (or similar) for
      logout removing `sessions` row and for add-passkey requiring an active
      session.

### Implementation for User Story 4

- [ ] T025 [US4] Implement authenticated add-passkey API under
      `routes/api/auth/` per `specs/004-passkey-auth/contracts/README.md`.
- [ ] T026 [US4] Update `routes/api/auth/logout.ts` to delete the DB session and
      emit clearing `Set-Cookie` via `lib/session.ts`.
- [ ] T027 [US4] Add `routes/account/index.tsx` (or `manage.tsx`) plus
      `islands/AccountManage.tsx` for add-passkey + **log out** controls (signals
      only)—this surface is the **sole** UI that ends sessions for users (FR-009;
      pairs with T023 admin cleanup).
- [ ] T028 [US4] Ensure `routes/index.tsx` exposes account management within
      **two** navigational steps for logged-in users (SC-004) and does not add
      global logout chrome (FR-009).

**Checkpoint**: All four user stories independently testable.

---

## Phase 7: Polish and cross-cutting

**Purpose**: Remove legacy tables/code, align docs, final gates.

- [ ] T029 [P] Remove `admin_users` from `db/schema.ts` and delete dead imports
      after migration is verified on a fresh DB.
- [ ] T030 [P] Update `specs/004-passkey-auth/quickstart.md` with final env vars,
      migration order, and mobile/passkey smoke checklist.
- [ ] T031 [P] Run `deno task check` on the full change set before merge.
- [ ] T032 Manually exercise registration, login, account management, admin
      deny/allow on a phone-sized viewport; note outcome in PR or quickstart.
- [ ] T033 Confirm **quiz identity** is unchanged: no edits to `/quiz/...` path
      semantics, `lib/slug.ts`, or `lib/categories.ts` quiz selection beyond
      imports; document confirmation in `specs/004-passkey-auth/quickstart.md`
      (FR-000).
- [ ] T034 [P] Finalize `specs/004-passkey-auth/quickstart.md` **SC-005**
      procedure (**five** consecutive paired logins, passkeys used alternately)
      and the **edge-case** checklist (expired session, unknown session cookie,
      per-browser logout, add-passkey failure mid-flow, admin flag change) per
      `spec.md` Edge Cases.
- [ ] T035 [P] Optional **SC-001** check: time a cold registration once on a
      passkey-capable device; record whether **under 3 minutes** in quickstart
      notes (manual KPI, not blocking CI).

---

## Dependencies and execution order

### Phase dependencies

- **Phase 1** → **Phase 2** → **Phases 3–6** (US1–US4) → **Phase 7**
- **Phase 2** blocks all user stories.

### User story dependencies

- **US1**: After Phase 2 — no dependency on other stories.
- **US2**: After Phase 2 — complements US1; together they form MVP auth loop.
- **US3**: After US2 session/login works (needs real session in `ctx.state`).
- **US4**: After US1 + US2 (needs login + registration flows).

### Suggested MVP scope

- Minimum shippable: **Phase 1 + Phase 2 + US1 + US2** (register + discoverable
  login + DB sessions).
- US3–US4 complete the spec’s admin and account-management commitments.

### Parallel opportunities

- **Phase 1**: T002 can run parallel to T001 if different owners.
- **Phase 2**: T005 vs T006 [P] after T003–T004 schema land.
- **US1**: T010 parallel to T014 prep; T012–T013 sequential.
- **US2**: T016 parallel to T019 prep.
- **US3**: T020 parallel to T022 file inventory.
- **US4**: T024 parallel to T027 UI sketch.
- **Phase 7**: T029–T031 mostly [P] after features merge.

### Parallel example: User Story 1

```text
# Together after Phase 2:
T010 [P] [US1] tests/auth_username_test.ts
T014 [P] [US1] islands/AccountRegistration.tsx (while API tasks T012–T013 proceed)
```

### Parallel example: User Story 2

```text
# Together after US1 API stable:
T016 [P] [US2] tests/webauthn_options_test.ts (or documented manual)
T019 [P] [US2] islands/AccountLogin.tsx
```

---

## Implementation strategy

### MVP first (register + login)

1. Complete Phase 1–2.
2. Complete Phase 3 (US1) and Phase 4 (US2).
3. Stop and validate discoverable login + registration independently.

### Incremental delivery

1. Add Phase 5 (US3) for admin gating.
2. Add Phase 6 (US4) for account management and logout placement.
3. Finish Phase 7 polish.

### Format validation

- All tasks use `- [ ] Tnnn` checklist lines with sequential IDs **T001–T035**.
- User-story tasks include **[US1]–[US4]** labels.
- **[P]** marks parallel-friendly items.
- Each task names at least one concrete file or directory path.

---

## Notes

- Keep SSR-only markup in `components/` and non-island routes; WebAuthn client
  code only in `islands/` with **@preact/signals**.
- Quiz routes and identity must remain unchanged (FR-000).
- Do not add in-app admin promotion logic (FR-006).
