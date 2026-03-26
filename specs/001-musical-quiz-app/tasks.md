---

## description: "Task list for Musical Quiz App MVP implementation"

# Tasks: Musical Quiz App MVP

**Input**: Design documents from `/specs/001-musical-quiz-app/`
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories),
`research.md`, `data-model.md`, `contracts/`

**Tests**: Verification is REQUIRED by the constitution. Include automated tests
for deterministic logic and higher-risk server behavior whenever applicable. If
automation is not practical, add explicit manual validation tasks instead of
omitting verification.

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. `US1`, `US2`, `US3`)
- Include exact file paths in descriptions

## Path Conventions

- **Fresh app**: `routes/`, `islands/`, `components/`, `lib/`, `db/`, `static/`,
  `assets/`
- **Docs/specs**: `docs/`, `specs/`, `.specify/`
- **Tests**: `tests/unit/`, `tests/integration/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the repo for feature implementation and verification

- [x] T001 Create the Fresh test layout in `tests/unit/` and
      `tests/integration/` for quiz, route, and auth coverage
- [x] T002 Update `deno.json` to ensure `deno test` covers the new `tests/` tree
      and any required test-time imports/configuration
- [x] T003 [P] Add or refine shared feature notes in
      `specs/001-musical-quiz-app/quickstart.md` for seeded data, passkey
      bootstrap, and mobile validation prerequisites

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story can
be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Update `db/schema.ts` to standardize track audio storage and add
      `adminUsers` plus `passkeys` tables
- [x] T005 [P] Update `db/relations.ts` and `db/db.ts` to reflect the expanded
      schema and required relations/query access
- [x] T006 [P] Add deterministic identity helpers in `lib/prng.ts` and
      `lib/slug.ts`
- [x] T007 [P] Add answer normalization and quiz-selection helpers in
      `lib/normalize.ts` and `lib/selectTracks.ts`
- [x] T008 Add category availability and title-query helpers in
      `lib/categories.ts` so only category+difficulty combinations with at least
      20 eligible tracks are startable
- [x] T009 Add passkey/session infrastructure in `lib/auth.ts` for challenge
      handling, cookie issuance, and admin-session validation
- [x] T010 Add shared quiz/admin TypeScript types in `lib/types.ts` for
      `QuizIdentity`, `QuizSettings`, `QuizProgress`, and admin session payloads
- [x] T011 Confirm server/client boundaries by wiring all DB access and auth
      verification through `db/`, `lib/`, and route handlers only, documenting
      any client payload assumptions in
      `specs/001-musical-quiz-app/quickstart.md`

**Checkpoint**: Foundation ready - user story implementation can now begin in
parallel

---

## Phase 3: User Story 1 - Complete a music quiz on mobile (Priority: P1) 🎯 MVP

**Goal**: Deliver a fully playable 20-track quiz flow from home screen to
results screen on mobile-first UI

**Independent Test**: A player can choose an available category+difficulty,
start a quiz, play tracks, submit or skip answers, and finish with a visible
score and per-track summary.

### Verification for User Story 1

- [x] T012 [P] [US1] Add unit tests for deterministic helpers in
      `tests/unit/lib/slug_test.ts`, `tests/unit/lib/prng_test.ts`,
      `tests/unit/lib/normalize_test.ts`, and
      `tests/unit/lib/select_tracks_test.ts`
- [x] T013 [P] [US1] Add route/integration coverage for quiz start, invalid URL
      redirect, and 20-track loading in
      `tests/integration/routes/quiz_routes_test.ts`
- [x] T014 [US1] Update `specs/001-musical-quiz-app/quickstart.md` with the
      exact manual validation steps for mobile playback, answer submission,
      skipping, and results

### Implementation for User Story 1

- [x] T015 [P] [US1] Replace the placeholder home route in `routes/index.tsx` to
      load available category+difficulty options and start quiz navigation
- [x] T016 [P] [US1] Add the quiz route handler/page in
      `routes/quiz/[category]/[slug]/index.tsx` to validate params, load
      deterministic tracks, and render quiz data
- [x] T017 [P] [US1] Add quiz shell components in
      `components/quiz/QuizPlayer.tsx` and
      `components/quiz/AudioTrackPlayer.tsx`
- [x] T018 [P] [US1] Implement interactive quiz state in
      `islands/QuizController.tsx` for active-track selection, score tracking,
      submit/skip flow, and results transition
- [x] T019 [P] [US1] Implement audio playback and answer selection in
      `islands/AudioPlayer.tsx` and `islands/AnswerInput.tsx`
- [x] T020 [US1] Add server-backed audio delivery in `routes/api/listen/[id].ts`
      and connect it to the quiz playback flow
- [x] T021 [US1] Preserve quiz identity, route validation, and answer-locking
      rules across `routes/index.tsx`,
      `routes/quiz/[category]/[slug]/index.tsx`, and
      `islands/QuizController.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and
testable independently

---

## Phase 4: User Story 2 - Share and resume the same quiz (Priority: P2)

**Goal**: Make quiz URLs safely shareable while preserving player-local settings
and device-local progress

**Independent Test**: A player can open a bare quiz URL, set replay preferences,
resume progress on the same device, and share the same quiz identity with
another player.

### Verification for User Story 2

- [x] T022 [P] [US2] Add unit and integration coverage for category-availability
      filtering and unavailable-combination redirects in
      `tests/unit/lib/categories_test.ts` and
      `tests/integration/routes/category_availability_test.ts`
- [x] T023 [P] [US2] Add integration coverage for settings-gate behavior, local
      progress resume, and copy-link behavior in
      `tests/integration/routes/share_resume_test.ts`
- [x] T024 [US2] Update `specs/001-musical-quiz-app/quickstart.md` with explicit
      share/resume/manual mobile validation steps

### Implementation for User Story 2

- [x] T025 [P] [US2] Add the settings-gate shell in `islands/SettingsGate.tsx`
      and integrate it into `islands/QuizController.tsx` (constitution VII:
      client input belongs in islands, not `components/`)
- [x] T026 [US2] Extend `islands/QuizController.tsx` to persist and restore
      `QuizProgress` in localStorage keyed by quiz path
- [x] T027 [P] [US2] Add replay-limit query parsing and category-availability
      filtering in `lib/categories.ts`, `routes/index.tsx`, and
      `routes/quiz/[category]/[slug]/index.tsx`
- [x] T028 [US2] Add results actions for copy-link and play-again in
      `components/quiz/QuizPlayer.tsx` and `islands/QuizController.tsx`
- [x] T029 [US2] Ensure bare quiz paths, query-param semantics, and invalid
      unavailable combinations fail safely in
      `routes/quiz/[category]/[slug]/index.tsx`

**Checkpoint**: At this point, User Stories 1 and 2 should both work
independently

---

## Phase 5: User Story 3 - Manage quiz content securely as an admin (Priority: P3)

**Goal**: Deliver passkey-authenticated admin access for managing tracks and
categories without direct DB access

**Independent Test**: An admin can sign in with a passkey, access `/admin`,
create/edit/delete tracks and categories, and encounter confirmation or blocking
behavior on destructive actions.

### Verification for User Story 3

- [x] T030 [P] [US3] Add auth helper and route coverage in
      `tests/unit/lib/auth_test.ts` and
      `tests/integration/routes/admin_auth_test.ts`
- [x] T031 [P] [US3] Add integration coverage for admin CRUD and
      destructive-action safeguards in
      `tests/integration/routes/admin_crud_test.ts`
- [x] T032 [US3] Update `specs/001-musical-quiz-app/quickstart.md` with passkey
      bootstrap, admin-login, and destructive-action validation steps

### Implementation for User Story 3

- [x] T033 [P] [US3] Add passkey auth endpoints in `routes/api/auth/register.ts`
      and `routes/api/auth/authenticate.ts`
- [x] T034 [P] [US3] Add admin login and dashboard routes in
      `routes/admin/login.tsx` and `routes/admin/index.tsx`
- [x] T035 [P] [US3] Add category CRUD routes in
      `routes/admin/categories/index.tsx`, `routes/admin/categories/new.tsx`,
      and `routes/admin/categories/[id].tsx`
- [x] T036 [P] [US3] Add track CRUD routes in `routes/admin/tracks/index.tsx`,
      `routes/admin/tracks/new.tsx`, and `routes/admin/tracks/[id].tsx`
- [x] T037 [P] [US3] Implement admin form components in
      `components/admin/CategoryForm.tsx` and `components/admin/TrackForm.tsx`
- [x] T038 [P] [US3] Implement passkey UI and dynamic admin interactions in
      `islands/AdminForms.tsx`
- [x] T039 [US3] Enforce admin auth guards, category-delete blocking, and
      explicit delete confirmations across `routes/admin/` and `lib/auth.ts`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improve completeness, consistency, and release readiness across all
stories

- [x] T040 [P] Add share metadata and final page-head updates in
      `routes/quiz/[category]/[slug]/index.tsx`
- [x] T041 [P] Reconcile the current track audio field naming across
      `db/schema.ts`, `lib/selectTracks.ts`, `routes/api/listen/[id].ts`, and
      any seeded data consumers
- [x] T042 [P] Run and fix automated verification via `deno fmt --check .`,
      `deno lint .`, `deno check`, and `deno test`
- T043 Run the full manual quickstart validation in
  `specs/001-musical-quiz-app/quickstart.md`, including mobile, share/resume,
  and admin flows
- T044 [P] Update product/technical docs in `docs/DESIGN.md` and
  `docs/ARCHITECTURE.md` only if implementation choices materially diverge from
  the current docs

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user
  stories
- **User Stories (Phase 3+)**: All depend on Foundational completion
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational and delivers the first
  playable MVP
- **User Story 2 (P2)**: Starts after Foundational; builds on quiz
  routes/components but must remain independently testable
- **User Story 3 (P3)**: Starts after Foundational; is largely independent of
  player flow beyond shared DB schema and auth helpers

### Within Each User Story

- Verification tasks should be completed before the story is treated as done
- Server helpers before routes
- Routes before UI integration
- UI shell/components before behavior-rich islands
- Story checkpoint validation before moving to the next priority

### Parallel Opportunities

- `T003`, `T005`, `T006`, `T007`, and `T010` can proceed in parallel after setup
  starts
- Within `US1`, `T015`-`T019` can be split across team members once foundational
  helpers are ready
- Within `US2`, `T025`, `T027`, and `T028` can run in parallel after local
  persistence interfaces are agreed
- Within `US3`, `T033`-`T038` can run in parallel once the auth/session contract
  is stable

---

## Implementation Strategy

### MVP First

1. Finish Phases 1 and 2 to establish schema, deterministic helpers, and
   auth/session foundations.
2. Complete Phase 3 to ship the first playable mobile quiz experience.
3. Validate `US1` end-to-end before adding sharing/resume or admin scope.

### Incremental Delivery

1. Add share/resume behavior in Phase 4 without changing quiz identity
   semantics.
2. Add admin authentication and CRUD in Phase 5 after player flow is stable.
3. Use Phase 6 for metadata, final verification, and any doc sync required by
   the finished implementation.

### Notes

- Keep all database access and passkey verification on the server.
- Do not expose unavailable category+difficulty combinations in the home screen.
- Keep replay limits and progress player-local; they must never alter track
  selection.
