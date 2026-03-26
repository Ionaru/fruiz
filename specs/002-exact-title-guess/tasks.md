---
description: "Task list for 002-exact-title-guess (submit gating)"
---

# Tasks: Guess submission gated on dataset title match (scoring-aligned)

**Input**: Design documents from `/specs/002-exact-title-guess/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md),
[research.md](./research.md), [data-model.md](./data-model.md),
[contracts/README.md](./contracts/README.md), [quickstart.md](./quickstart.md)

**Tests**: Constitution requires verification. Include unit tests for the pure
matching helper; manual steps reference `quickstart.md`.

**Organization**: Tasks are grouped by user story (US1 = P1 gating, US2 = P2
affordance).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete
  tasks in the same wave)
- **[Story]**: User story label `[US1]` / `[US2]` for story phases only
- Paths are relative to repository root

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Align on acceptance paths and baseline tooling before edits.

- [x] T001 Review `specs/002-exact-title-guess/plan.md` and
      `specs/002-exact-title-guess/quickstart.md` for file touch list and manual
      scenarios
- [x] T002 [P] Run `deno task check` at repository root to confirm baseline
      passes before feature edits

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm data flow and architecture constraints before island
changes.

**⚠️ CRITICAL**: No user story implementation until this phase is complete.

- [x] T003 Confirm `getDistinctTitlesForCategory` in `lib/categories.ts` and its
      use in `routes/quiz/[category]/[slug]/index.tsx` hydrate the **full**
      category distinct-title list as `titleSuggestions` (matches spec/plan; no
      accidental subset)
- [x] T004 Confirm touched island code uses `@preact/signals` only (e.g.
      `useSignal` / `useSignalEffect`) and does **not** import `preact/hooks`
      per `specs/002-exact-title-guess/plan.md` and constitution VII

**Checkpoint**: Foundation ready — user story work may begin.

---

## Phase 3: User Story 1 — Submit only when input matches a dataset title (Priority: P1) 🎯 MVP

**Goal**: Enable Submit only when guess text matches at least one title in the
full suggestion pool using the same normalization as scoring
(`normalizeAnswer`); block `onSubmit` when not matched (defense in depth).

**Independent Test**: Non-matching / partial / typo text cannot submit; input
that normalizes-equal to a pool title can submit (including a pool title not in
the current 20 tracks — then scored incorrect for active track per existing
rules).

### Implementation for User Story 1

- [x] T005 [US1] Implement `guessMatchesSuggestionPool` in `lib/guess_match.ts`
      (export name may match plan/research) using `normalizeAnswer` from
      `lib/normalize.ts` per `specs/002-exact-title-guess/research.md`

### Verification for User Story 1 ⚠️

- [x] T006 [P] [US1] Add unit tests in `tests/guess_match_test.ts` for
      `guessMatchesSuggestionPool` covering empty/whitespace-only input,
      non-matching strings, normalized matches (case/punctuation/spacing per
      `lib/normalize.ts`), and duplicate normalized titles in the pool list

### Integration for User Story 1

- [x] T007 [US1] Integrate gating in `islands/QuizController.tsx`: disable
      Submit when `answerLocked` or
      `!guessMatchesSuggestionPool(answerDraft,
      props.titleSuggestions)`;
      early-return in `onSubmit` when the predicate is false

**Checkpoint**: User Story 1 complete — gating matches spec FR-001–FR-005 for
core submit behavior.

---

## Phase 4: User Story 2 — Understand when submission is allowed (Priority: P2)

**Goal**: Players can tell whether submission is allowed without guessing
(FR-004, User Story 2) — beyond color alone where feasible.

**Independent Test**: With invalid vs valid pool-matching input, affordance
clearly differs (disabled submit vs enabled); keyboard/mobile still operable per
`specs/002-exact-title-guess/quickstart.md`.

### Implementation for User Story 2

- [x] T008 [US2] Improve submit-state communication in
      `islands/QuizController.tsx` and/or `components/Button.tsx` (e.g.
      `aria-disabled`, concise helper text, or `title` when disabled due to
      gating — avoid relying on color alone)
- [x] T009 [P] [US2] If helper copy is added, wire `aria-describedby` / labeling
      in `islands/AnswerInput.tsx` only as needed for the chosen UX

### Verification for User Story 2 ⚠️

- [x] T010 [US2] Re-run relevant manual steps in
      `specs/002-exact-title-guess/quickstart.md` focusing on affordance clarity
      (disabled vs enabled Submit)

**Checkpoint**: User Stories 1 and 2 both independently verifiable.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Repo gates and final validation.

- [x] T011 Run `deno task check` and `deno test -A tests/` at repository root
      after all edits
- [x] T012 [P] Complete full manual pass of
      `specs/002-exact-title-guess/quickstart.md` (including mobile viewport and
      full-pool edge case)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** → **Phase 2** → **Phase 3 (US1)** → **Phase 4 (US2)** → **Phase
  5**
- **US2** should not regress **US1**; implement US1 checkpoint before US2 if
  sequencing alone.

### User Story Dependencies

- **US1 (P1)**: After Phase 2; no dependency on US2.
- **US2 (P2)**: After Phase 2; builds on US1 submit states (same files —
  sequential editing recommended).

### Within User Story 1

- **T005** (library) before **T006** (tests) and **T007** (integration).
- **T006** and **T007** may overlap only after **T005** lands; all tests must
  pass before closing the story.

### Parallel Opportunities

- **T002** parallel with other setup if multiple agents (otherwise run after
  T001).
- After **T005** exists: **T006** (tests in `tests/guess_match_test.ts`) and
  **T007** (`islands/QuizController.tsx`) can proceed in parallel by different
  contributors if **T007** only imports the stable export.
- **T009** [P] may run parallel to **T008** if they touch different files
  without conflict.
- **T012** [P] can run parallel to **T011** if two people (one automated, one
  manual).

---

## Parallel Example: User Story 1

```text
# After T005 (lib export landed), in parallel:
- T006 [P] [US1] tests/guess_match_test.ts
- T007 [US1] islands/QuizController.tsx integration (coordinate on export name)
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (T005 lib, then T006 tests and T007 integration).
3. **STOP**: Run tests + quickstart scenarios for US1; demo MVP.

### Incremental Delivery

1. Add Phase 4 (US2) for clearer affordance.
2. Phase 5 for full repo gates and manual sign-off.

---

## Notes

- SSR-only UI stays in `components/`; interactive behavior in `islands/` only.
- Prefer `@preact/signals` for new island state; do not expand `preact/hooks` in
  modified code paths.
- Commit after each task or logical group.
