---

## description: "Task list template for feature implementation"

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/` **Prerequisites**:
plan.md (required), spec.md (required for user stories), research.md,
data-model.md, contracts/

**Tests**: Verification is REQUIRED by the constitution. Include automated tests
for deterministic logic and higher-risk server behavior whenever applicable. If
automation is not practical, add explicit manual validation tasks instead of
omitting verification.

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Fresh app**: `routes/`, `islands/`, `components/`, `lib/`, `db/`, `static/`,
  `assets/`
- **Docs/specs**: `docs/`, `specs/`, `.specify/`
- **Tests**: place tests in the project-appropriate location defined by
  `plan.md`
- Paths shown below are examples - replace them with the real structure from
  `plan.md`

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Confirm `deno check` and `deno fmt --check` (or repo
      `deno task check` when it covers them) pass for the feature scope
- [ ] T004 [P] Capture constitution-driven validation approach in
      `specs/[###-feature-name]/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can
be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T004 Setup database schema and migrations framework
- [ ] T005 [P] Implement authentication/authorization framework
- [ ] T006 [P] Setup API routing and middleware structure
- [ ] T007 Create base models/entities that all stories depend on
- [ ] T008 Configure error handling and logging infrastructure
- [ ] T009 Setup environment configuration management
- [ ] T010 Confirm server/client boundary for affected routes, islands, and data
      flows; SSR-only `components/` and non-island routes with client behavior
      confined to `islands/`

**Checkpoint**: Foundation ready - user story implementation can now begin in
parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Verification for User Story 1 ⚠️

> **NOTE:** Add the verification needed by the constitution before or alongside
> implementation. Pure logic changes require automated tests. Route, auth,
> persistence, and mobile UX changes require automated coverage or explicit
> manual validation tasks.

- [ ] T011 [P] [US1] Add unit test coverage for deterministic logic in [test
      path]
- [ ] T012 [P] [US1] Add integration or route-level test coverage for [user
      journey] in [test path]
- [ ] T013 [US1] Document manual mobile/accessibility validation in
      `specs/[###-feature-name]/quickstart.md`

### Implementation for User Story 1

- [ ] T014 [P] [US1] Create or update supporting data/types in `lib/` or `db/`
- [ ] T015 [P] [US1] Implement server behavior in `routes/` or `lib/`
- [ ] T016 [P] [US1] Implement UI changes in `components/` or `islands/`
- [ ] T017 [US1] Preserve quiz identity, query-param semantics, and
      validation/error handling
- [ ] T018 [US1] Add admin confirmation or session safeguards if this story
      touches `/admin/*`

**Checkpoint**: At this point, User Story 1 should be fully functional and
testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Verification for User Story 2 ⚠️

- [ ] T019 [P] [US2] Add unit test coverage for deterministic logic in [test
      path]
- [ ] T020 [P] [US2] Add integration or route-level test coverage for [user
      journey] in [test path]
- [ ] T021 [US2] Document manual mobile/accessibility validation in
      `specs/[###-feature-name]/quickstart.md`

### Implementation for User Story 2

- [ ] T022 [P] [US2] Create or update supporting data/types in `lib/` or `db/`
- [ ] T023 [US2] Implement server behavior in `routes/` or `lib/`
- [ ] T024 [US2] Implement UI changes in `components/` or `islands/`
- [ ] T025 [US2] Integrate with User Story 1 components while preserving
      server/client and components/islands boundaries

**Checkpoint**: At this point, User Stories 1 AND 2 should both work
independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Verification for User Story 3 ⚠️

- [ ] T026 [P] [US3] Add unit test coverage for deterministic logic in [test
      path]
- [ ] T027 [P] [US3] Add integration or route-level test coverage for [user
      journey] in [test path]
- [ ] T028 [US3] Document manual mobile/accessibility validation in
      `specs/[###-feature-name]/quickstart.md`

### Implementation for User Story 3

- [ ] T029 [P] [US3] Create or update supporting data/types in `lib/` or `db/`
- [ ] T030 [US3] Implement server behavior in `routes/` or `lib/`
- [ ] T031 [US3] Implement UI changes in `components/` or `islands/`

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Documentation updates in docs/
- [ ] TXXX Code cleanup and refactoring
- [ ] TXXX Performance optimization across all stories
- [ ] TXXX [P] Additional automated verification for deterministic logic or
      route behavior
- [ ] TXXX Security hardening
- [ ] TXXX Run mobile, accessibility, and quickstart validation
- [ ] TXXX [P] Run `deno check` and `deno fmt --check` on the change set before
      final review

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user
  stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No
  dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate
  with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate
  with US1/US2 but should be independently testable

### Within Each User Story

- Required verification tasks MUST be defined before implementation is
  considered complete
- Automated tests for pure logic SHOULD be written before implementation when
  feasible
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if
  team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch verification work for User Story 1 together:
Task: "Add unit test coverage for deterministic logic in [test path]"
Task: "Add integration or route-level test coverage for [user journey] in [test path]"

# Launch all models for User Story 1 together:
Task: "Create [Entity1] model in src/models/[entity1].py"
Task: "Create [Entity2] model in src/models/[entity2].py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Include constitution-driven verification and mobile validation tasks
- Place SSR-only UI in `components/`; client-side JavaScript belongs in
  `islands/` only
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break
  independence
