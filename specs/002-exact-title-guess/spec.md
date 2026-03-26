# Feature Specification: Guess submission gated on dataset title match (scoring-aligned)

**Feature Branch**: `002-exact-title-guess`\
**Created**: 2025-03-26\
**Status**: Draft\
**Input**: User description: "When a user types something into the answer input,
submitting a guess should only be possible when the guess exactly matches a
title from the dataset."

## Clarifications

### Session 2025-03-26

- Q: Should submit eligibility use the same title-equality rules as
  authoritative scoring, strict string identity, or only autocomplete suggestion
  strings? → A: **Same normalization and equality rules as scoring** (Option A).
- Q: Should the comparison set be only titles that appear as tracks in the
  current quiz, or the full suggestion pool for the category? → A: **Full pool**
  — the full category (suggestion) title set, not limited to the current quiz’s
  track list.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Submit only when input matches a dataset title (Priority: P1)

While playing the quiz, a player types text into the answer field. They can only
submit that text as a guess when it **matches at least one title in the full
category suggestion pool under the same rules used to score correctness** (see
Assumptions)—including titles that may not appear among the current quiz’s
tracks. Until then, guess submission is not available.

**Why this priority**: This is the core rule change: it prevents invalid or
partial submissions and keeps submit eligibility aligned with what the product
already treats as a valid title match for scoring.

**Independent Test**: Open a quiz, type text that does not match any dataset
title under those rules and confirm submit cannot complete a guess; type text
that does match at least one dataset title under those rules and confirm submit
succeeds.

**Acceptance Scenarios**:

1. **Given** the player is in an active quiz session and the **full** category
   suggestion title set for that context is known, **When** the answer field
   contains text that matches at least one title in that set per the scoring
   equality rules, **Then** the player can submit a guess (even if that title
   has no track in the current quiz).
2. **Given** the player is in an active quiz session, **When** the answer field
   contains text that does not match any title in that full set under those
   rules (including partial matches and typos), **Then** the player cannot
   submit a guess.
3. **Given** the answer field is empty or only whitespace, **When** the player
   attempts to submit, **Then** submission is not possible.

---

### User Story 2 - Understand when submission is allowed (Priority: P2)

The player can tell whether their current input can be submitted (for example,
submit control disabled vs enabled, or equivalent affordance), without guessing
whether an invisible action might fire.

**Why this priority**: Reduces confusion and supports mobile and keyboard use
when submission is gated.

**Independent Test**: With invalid and valid input, observe the submit
affordance state and confirm it matches whether submission is allowed.

**Acceptance Scenarios**:

1. **Given** the input does not match any dataset title under the scoring
   equality rules, **When** the player views the guess submission control,
   **Then** it is clear that submission is not available (e.g., disabled or not
   actionable in an equivalent way).
2. **Given** the input matches at least one dataset title under those rules,
   **When** the player views the guess submission control, **Then** submission
   is clearly available.

---

### Edge Cases

- **Title in the full pool but not in the current quiz**: If the input matches a
  valid category title that does not correspond to any track in this quiz
  instance, submission is still allowed; correctness after submit follows
  existing scoring (e.g. incorrect for the active track).
- **Duplicate titles**: If the same canonical title appears more than once in
  the comparison set, any input that matches that title under the scoring
  equality rules still allows submission.
- **Whitespace-only input**: Treated as not matching any title after the same
  trimming rules as scoring; submission remains blocked.
- **Titles that differ only by case, punctuation, or spacing**: Handled exactly
  as for scoring (e.g. pairs that normalize the same way count as a match for
  gating).
- **Rapid typing**: Submit availability updates as the input changes, without
  allowing submission for a stale invalid value.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-000**: This feature does **not** change quiz identity (`/quiz/...` path
  semantics) or deterministic track selection. It affects **player-local
  interaction** with the answer input and when a guess may be submitted, not
  which quiz is loaded.
- **FR-001**: The product MUST compare the player’s current answer text to the
  **full category suggestion title set** the product already uses for that play
  context (see Assumptions)—**not** a subset limited to titles of tracks that
  appear only in the current quiz instance, and not an ad-hoc set invented only
  for this gate.
- **FR-002**: Guess submission MUST be possible only when the input **matches at
  least one title in that full set using the same normalization and equality
  rules** used for authoritative scoring (see Assumptions).
- **FR-003**: Guess submission MUST NOT be possible when there is no such match
  (including empty or whitespace-only input after the same trimming applied for
  scoring comparisons).
- **FR-004**: The submit affordance MUST reflect whether submission is currently
  allowed, consistent with FR-002 and FR-003 (see User Story 2).
- **FR-005**: If submission is attempted while the input does not match any
  dataset title under those rules, the system MUST not record a guess; every
  submission path MUST honor the same gating rules.

### Key Entities _(include if feature involves data)_

- **Dataset title**: A title string in the **full category suggestion pool** for
  the current play context (see Assumptions), eligible for comparison using the
  scoring equality rules.
- **Guess input**: The text currently entered in the answer field, evaluated
  before submission is allowed.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In manual or automated checks over a representative set of
  quizzes, 100% of non-matching inputs (including partial titles and typos) do
  not result in a submitted guess.
- **SC-002**: In the same checks, 100% of inputs that match a dataset title per
  the scoring equality rules (per Assumptions) successfully allow submission
  when the player chooses to submit.
- **SC-003**: At least 90% of participants in a short usability check (or
  internal review) correctly infer whether submission is available from the
  submit affordance alone, without trial-and-error submission.
- **SC-004**: When input matches a dataset title per the scoring equality rules
  (per Assumptions), players are never blocked from submitting only because of
  this gating rule.

## Constitution Alignment _(mandatory)_

### Quiz Identity Impact

- **Identity Change**: No. Which tracks and titles belong to a quiz is
  unchanged; only when the client may submit a guess is constrained.
- **Player-Local State**: Answer input and submit eligibility are interaction
  state. They do not alter shareable quiz URL semantics or server-side selection
  of the quiz corpus.

### Security & Data Boundaries

- **Server Responsibilities**: Authoritative validation of guesses against the
  correct answer for scoring (if applicable) remains server-side per existing
  architecture; this spec does not move corpus or selection logic to the client
  beyond what is already exposed for play.
- **Client Responsibilities**: Gating submission against the **full** category
  suggestion title set already required for play (e.g. autocomplete); minimum
  data principle unchanged.
- **Components Versus Islands**: Submission gating and input state follow the
  project’s existing split between server-rendered UI and client interaction
  code; no new prohibited client patterns in server-only UI layers.

### Mobile & Accessibility Validation

- **Primary Mobile Flow**: Player focuses the answer field, types, and uses the
  on-screen submit control; control state clearly shows when submit is allowed.
- **Validation Evidence**: Touch activation, visible focus, and labels on the
  input and submit control are verified on a phone-sized viewport; keyboard
  users can operate submit when enabled without requiring a mouse.

### Code Quality & Tooling

- **Deno**: Delivered changes are expected to pass `deno check` and
  `deno fmt --check` where they touch project code, consistent with repository
  standards.
- **Maintainability**: Matching rules MUST be centralized or reused so submit
  gating cannot drift from the title comparison used for scoring.

## Assumptions

- **Title match definition (submit gating)**: Whether the player may submit MUST
  use **the same normalization and equality rules** the product already applies
  when deciding if a typed answer **matches a title for scoring** (including
  trimming, case handling, punctuation/spacing treatment, and any other steps in
  that pipeline). Submit MUST NOT use a stricter or looser definition than
  scoring. If scoring rules change later, gating MUST follow them unless a
  future spec deliberately decouples them.
- **Title set**: “The dataset” means the **full** collection of titles used for
  category-scoped answer suggestions in that play context—the same pool offered
  for autocomplete—not merely the subset of titles that happen to appear as
  tracks in the current quiz instance.
- **Out of scope**: Changing the scoring rules themselves, adding fuzzy or
  partial matching beyond what scoring already allows, or changing quiz content
  or URLs.
