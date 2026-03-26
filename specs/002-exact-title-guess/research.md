# Research: 002-exact-title-guess

**Date**: 2025-03-26

## Decision 1: Single source of truth for “match”

**Decision**: Reuse **`normalizeAnswer`** from `lib/normalize.ts` for both (a)
submit gating against `titleSuggestions` and (b) existing scoring in
`islands/QuizController.tsx`
(`normalizeAnswer(answerDraft.value) === normalizeAnswer(track.title)`).

**Rationale**: Matches spec clarification (scoring-aligned). Any future change
to normalization automatically keeps gating and scoring consistent if both call
the same function.

**Alternatives considered**: Duplicate normalization in the island (rejected:
drift risk). Server round-trip to validate submit (rejected: unnecessary
latency, constitution prefers minimal client payload for interaction).

## Decision 2: Comparison set = `titleSuggestions` as loaded today

**Decision**: The pool for gating is exactly **`props.titleSuggestions`**,
populated server-side by **`getDistinctTitlesForCategory`** in
`routes/quiz/[category]/[slug]/index.tsx`.

**Rationale**: Matches spec (“full category suggestion pool”). Already distinct
titles for the category; includes titles not selected into the current 20-track
quiz.

## Decision 3: Predicate API shape

**Decision**: Implement a pure function, e.g.
`guessMatchesSuggestionPool(input: string, suggestions: readonly string[]): boolean`,
with:

- `false` when `input.trim() === ""` (whitespace-only).
- Otherwise
  `suggestions.some((title) => normalizeAnswer(input) === normalizeAnswer(title))`.

**Rationale**: Trivial to unit test; mirrors scoring comparison operator.

## Decision 4: Performance with large title lists

**Decision**: Start with **straightforward `.some()`** per evaluation. If
profiling shows input jank, **precompute**
`suggestions.map((t) => normalizeAnswer(t))` once when `titleSuggestions`
reference is stable (e.g. on first render / when props change) and compare only
`normalizeAnswer(input)` to that set (or `Set` for O(1) lookup).

**Rationale**: Correctness first; optimization is localized and does not change
semantics.

## Decision 5: Keyboard / alternate submit paths

**Decision**: There is **no `<form>`** around the answer field today; primary
path is **Submit** `onClick`. Still add **`onSubmit` guard** so programmatic or
future paths cannot record a guess without a pool match.

**Rationale**: Satisfies FR-005 with minimal code.

## Open items (none blocking plan)

- Optional a11y copy linking disabled Submit to “choose a title from
  suggestions” — product copy, not blocking.
