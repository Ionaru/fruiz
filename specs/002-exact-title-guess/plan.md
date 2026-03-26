# Implementation Plan: Guess submission gated on dataset title match (scoring-aligned)

**Branch**: `002-exact-title-guess` | **Date**: 2025-03-26 | **Spec**:
[spec.md](./spec.md)\
**Input**: Feature specification from `/specs/002-exact-title-guess/spec.md`

## Summary

Gate the quiz **Submit** control so it is enabled only when the current answer
text matches **at least one** title in the **full category suggestion list**
(`titleSuggestions`), using **`normalizeAnswer`**—the same function already used
to score correct vs incorrect against the active track’s `track.title`. Empty or
whitespace-only input stays non-submittable. **Server route and quiz identity
are unchanged**; `getDistinctTitlesForCategory` already supplies the full pool
on the quiz page.

## Technical Context

**Language/Version**: TypeScript on Deno (see repo `deno.json`)\
**Primary Dependencies**: Fresh 2.x (`jsr:@fresh/core`), Preact,
`@preact/signals`, Vite, Drizzle ORM\
**Storage**: Existing SQLite/DB for categories and tracks; no schema change for
this feature\
**Testing**: `deno test -A tests/` (add unit tests under `tests/` for new pure
helpers)\
**Target Platform**: Mobile-first web (Fresh SSR + islands)\
**Project Type**: Web application (Fresh + islands + server routes)\
**Performance Goals**: Submit eligibility should update smoothly while typing;
if the distinct-title list is large, precompute normalized suggestion keys once
per mount (see [research.md](./research.md))\
**Constraints**: Constitution—quiz identity unchanged; server-first data
boundaries; island interactivity in `islands/` only; signals-only island code
(`@preact/signals`, including `useSignalEffect` for storage side effects)\
**Scale/Scope**: One island (`QuizController`), one shared pure helper in
`lib/`, optional small `AnswerInput` a11y tweak

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Deterministic Quiz Identity**: **Pass.** No change to
  `/quiz/{category}/{slug}` semantics, seeding, or `selectTracksDeterministic`.
  Only client-side submit enablement changes.
- **Server-First Boundaries**: **Pass.** Track pool and `titleSuggestions`
  remain loaded server-side in `routes/quiz/[category]/[slug]/index.tsx` via
  `getDistinctTitlesForCategory`. No new client-fetched corpus.
- **Components Versus Islands**: **Pass.** Logic lives in
  `islands/QuizController.tsx` (submit disabled state, optional guard in
  `onSubmit`). Persistence uses **`useSignalEffect`** from `@preact/signals`
  only—**no** `preact/hooks` imports in application island code.
- **Mobile-First Playability**: **Pass.** Submit button remains a touch-friendly
  `Button`; disabled when no pool match so users see clear affordance. Verify
  focus order and that disabled state is not the only cue if contrast is weak
  (see quickstart).
- **Passkey-Secured Administration**: **N/A** — no `/admin/*` changes.
- **Verification Plan**: (1) **Unit tests** for new helper: matches known title
  with case/punctuation variants per `normalizeAnswer`; non-matching partial
  strings; empty/whitespace. (2) **Manual** on phone viewport: non-matching text
  → Submit disabled; normalized match against a title **not** in the current 20
  tracks → Submit enabled, submit yields incorrect for active track as today.
  (3) **`deno task check`** on touched files.
- **Code Quality & Deno Gates**: **`deno fmt --check`**, **`deno lint`**,
  **`deno check`** on affected paths; reuse `normalizeAnswer` from
  `lib/normalize.ts` (single source of truth with scoring).

## Project Structure

### Documentation (this feature)

```text
specs/002-exact-title-guess/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1 (behavioral note; no new HTTP API)
└── tasks.md             # From /speckit.tasks (not created here)
```

### Source Code (repository root)

```text
lib/
├── normalize.ts              # Existing normalizeAnswer; add pool-matching helper here or adjacent module
├── categories.ts             # Unchanged: getDistinctTitlesForCategory
└── ...

islands/
├── QuizController.tsx        # Derive canSubmit; wire Submit disabled + onSubmit guard
└── AnswerInput.tsx           # Optional: aria-disabled / aria-describedby coordination if needed

components/quiz/
└── QuizPlayer.tsx            # Pass-through props only (likely unchanged)

routes/quiz/[category]/[slug]/
└── index.tsx                 # Unchanged data loading

tests/
└── (new) normalize_guess_match_test.ts   # Or name aligned with helper file
```

**Structure Decision**: Single Fresh app at repo root; feature touches
**`lib/`** (pure logic) and **`islands/QuizController.tsx`** (UI gating). No new
routes or DB tables.

## Complexity Tracking

> No constitution violations required for this feature; table not used.

## Phase Outputs

| Phase | Artifact                  | Location                                     |
| ----- | ------------------------- | -------------------------------------------- |
| 0     | Research decisions        | [research.md](./research.md)                 |
| 1     | Data / domain notes       | [data-model.md](./data-model.md)             |
| 1     | Manual verification steps | [quickstart.md](./quickstart.md)             |
| 1     | Contracts                 | [contracts/README.md](./contracts/README.md) |

## Implementation Outline (for tasks phase)

1. Add
   **`guessMatchesSuggestionPool(raw: string, suggestions: string[]): boolean`**
   (name may vary) in `lib/`: return false if `raw.trim() === ""`; else return
   `suggestions.some((t) => normalizeAnswer(raw) === normalizeAnswer(t))`.
2. In **`QuizController`**, compute **`canSubmit`** from `answerDraft.value` and
   `props.titleSuggestions` (prefer a small pure helper or `useComputed` from
   `@preact/signals` if a derived signal is needed; avoid `preact/hooks`).
3. Set **Submit** `disabled={answerLocked || !canSubmit}` (replacing the current
   `trim() === ""` only check for the text part—keep `answerLocked`).
4. **Guard `onSubmit`**: if `!guessMatchesSuggestionPool(...)`, return early
   (defense in depth for FR-005).
5. **Tests**: cover normalization parity with scoring and edge cases from spec
   (pool title not in quiz, duplicates, whitespace).

After implementation, run **`deno task check`** and manual **quickstart**
scenarios.
