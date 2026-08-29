# 05 — Answer scoring and guess matching

> Player answers go through one normalization function, used everywhere equality
> matters: submit gating, autocomplete ranking, and scoring. Submit is only
> allowed when the typed text matches a title in the category-scoped suggestion
> pool under that normalization.

## Purpose

This subsystem owns:

- The canonical string normalization (`normalizeAnswer`).
- The submit-eligibility predicate (`guessMatchesSuggestionPool`).
- The autocomplete ranking helper (`suggestMatches`).
- The category-scoped suggestion pool hydrated onto the quiz page.
- The autocomplete UX in `AnswerInput` (combobox, keyboard navigation,
  pointer-outside dismissal).

The settings gate, the skip flow, and the replay-limit gate live in spec 04. The
"did this answer earn a collection slot" flow lives in spec 07.

## Behavior

### Normalization

[`src/lib/normalize.ts`](../src/lib/normalize.ts) defines a single function:

```ts
function normalizeAnswer(input: string): string;
```

Operations, applied in order:

1. Unicode NFD decomposition.
2. Strip combining marks (`\p{M}`).
3. Lowercase.
4. Trim.
5. Collapse runs of whitespace or `·` to a single space.
6. Drop the punctuation set: `. , : ; ' "` - – — ( ) [ ] { } ! ?`.
7. Trim again.

Consequences worth knowing:

- `"WALL·E"` normalizes the same as `"wall e"` and `"Wall-E"`.
- Accented characters fold to ASCII (`"Pokémon"` → `"pokemon"`).
- Multiple spaces collapse, but characters not in the punctuation set (e.g. `&`,
  `+`, `/`) are kept.

### Submit gating

`guessMatchesSuggestionPool(raw, suggestions)` in
[`src/lib/guess_match.ts`](../src/lib/guess_match.ts):

- Returns `false` for empty / whitespace-only input.
- Otherwise normalizes the input and returns `true` if at least one suggestion
  normalizes to the same string.

For `hard` quizzes the suggestion pool is the **full category** — every distinct
title in the category, including titles that are not in the current 20-track
quiz. That breadth is deliberate: it prevents the autocomplete from hinting at
which titles appear in the quiz.

**Easy mode is the exception.** Its suggestion pool is narrowed to
easy-difficulty titles only
(`getDistinctTitlesForCategory(db, categoryId, "easy")`), so the autocomplete is
genuinely easier. Because an easy quiz is composed exclusively of easy tracks
(`selectTracksDeterministic` filters to `difficulty === "easy"`), every answer
the player needs is still in the pool — the submit gate stays complete.

`QuizController` derives `canSubmitGuess` from this helper on every render and
binds it to the Submit button's `disabled` attribute (combined with
`answerLocked`). The submit handler defends the gate again before recording any
state change.

The `title=…` attribute on the disabled Submit button explains the gating
verbally:

- Empty input → "Type a title that matches the suggestions list."
- Non-empty no-match → "Adjust your answer to match a suggested title (same
  spelling rules as scoring)."

### Scoring

A row is `correct` iff
`normalizeAnswer(answerDraft) === normalizeAnswer(track.title)` _and_ the submit
gate allowed the click. Otherwise it is `incorrect`. The submitted `answerDraft`
is preserved as `selectedTitle` so the results screen can show what the player
typed.

`scoreFromProgress` (spec 04) counts `correct` plus `unavailable` rows.

### Autocomplete suggestions

`suggestMatches(raw, suggestions, limit)` ranks suggestions by quality:

- Rank 0: exact normalized match.
- Rank 1: title starts with the normalized query.
- Rank 2: title contains the normalized query.
- Anything else is filtered out.

Within a rank, the original input order is preserved (stable sort). The default
limit in `AnswerInput` is `MAX_MATCHES = 20`.

`AnswerInput` (island) implements a WAI-ARIA combobox pattern:

- The input has `role="combobox"`, `aria-autocomplete="list"`, and
  `aria-expanded` reflecting the dropdown state.
- Both `aria-expanded` here and `aria-selected` on the option rows are written
  as the literal strings `"true"` / `"false"`, never as a raw boolean. Elements
  compiled through the JSX precompile path serialize a boolean as an HTML
  boolean attribute, which renders `true` as a bare valueless attribute and
  drops the attribute altogether when false, leaving the state unreported.
- Up / Down arrows move `activeIndex` through the matches, with wrap-around.
- `Enter` commits the active suggestion. `Escape` closes the dropdown. `Tab`
  closes the dropdown without committing.
- A pointer event outside the container closes the dropdown.
- Hover on an option pre-activates it so a subsequent click commits.
- Selected suggestions write the title back through `onValue`, which the parent
  (`QuizController`) routes to `answerDraft`.

### Edge cases

- **Title in the pool but not in the current quiz** → submit allowed, answer
  recorded; scoring still compares to the _active track's_ title so the answer
  is `incorrect` (unless the player happened to pick a matching title for a
  different round).
- **Duplicate normalized titles in the pool** (two rows that normalize the same
  way) → both satisfy the gate; scoring is unaffected.
- **Whitespace-only input** → `false` from both helpers; the dropdown is closed
  and Submit is disabled.
- **Rapid typing** → the helper re-runs on every input event; the gate can flip
  on and off as the player edits.
- **Suggestion list is empty for a category** → the gate is unreachable (no
  value will match). This is prevented at the data layer by the 20-track
  eligibility rule (spec 02), which guarantees the suggestion pool is non-empty.

## Data model

No new tables or columns. The relevant data flows:

- `getDistinctTitlesForCategory(db, categoryId)` (spec 02) hydrates
  `titleSuggestions: string[]` onto the quiz page payload.
- `track.title` (snapshot for unavailable rounds; live otherwise — see spec 02)
  drives scoring on the active track.
- `selectedTitle` in `QuizProgressTrack` (spec 04) preserves the player's
  submitted text for the results screen.

## Key files

- **Server-only**
  - [`src/lib/normalize.ts`](../src/lib/normalize.ts) — `normalizeAnswer`.
  - [`src/lib/guess_match.ts`](../src/lib/guess_match.ts) —
    `guessMatchesSuggestionPool`, `suggestMatches`.
  - [`src/lib/categories.ts`](../src/lib/categories.ts) —
    `getDistinctTitlesForCategory` for the per-category suggestion pool.
- **Islands (client)**
  - [`src/islands/AnswerInput.tsx`](../src/islands/AnswerInput.tsx) — combobox
    UI, keyboard handling, suggestion list rendering.
  - [`src/islands/QuizController.tsx`](../src/islands/QuizController.tsx) —
    Submit gating, scoring, popup result wiring (see spec 04).
- **Components (SSR)**
  - [`src/components/quiz/AnswerSuggestionOption.tsx`](../src/components/quiz/AnswerSuggestionOption.tsx)
    — single suggestion row, carrying the `aria-selected` string above.
- **Tests**
  - [`tests/unit/lib/normalize_test.ts`](../tests/unit/lib/normalize_test.ts) —
    NFD, punctuation, whitespace cases.
  - [`tests/guess_match_test.ts`](../tests/guess_match_test.ts) — submit-gate
    predicate.
  - [`tests/suggest_matches_test.ts`](../tests/suggest_matches_test.ts) —
    ranking and ordering.
  - [`tests/unit/components/answer_suggestion_option_test.tsx`](../tests/unit/components/answer_suggestion_option_test.tsx)
    — `aria-selected` renders as `"true"` / `"false"`.
  - [`tests/unit/islands/answer_input_test.tsx`](../tests/unit/islands/answer_input_test.tsx)
    — the combobox's rendered ARIA contract.

## Constraints and invariants

- **Single source of truth for "match"** (DRY — see Principle VI in
  `AGENTS.md`). Submit gating, scoring, and autocomplete ranking MUST share
  `normalizeAnswer`. Any future change to the normalization rule takes effect
  everywhere at once.
- **Players cannot submit freeform answers.** The Submit button's `disabled`
  attribute and the `onSubmit` handler both enforce
  `guessMatchesSuggestionPool`. Defense in depth: removing the client-side
  enable check MUST NOT silently allow records to be written.
- **The suggestion pool is category-scoped, never quiz-scoped.** Filtering to
  the 20 quiz tracks would leak the answer set.
- **Principle II — Server-first data boundaries.** Suggestions are loaded once
  on the server (in the quiz route handler) and rendered with the page; there is
  no client fetch path for the suggestion pool.

## Verification approach

- **Unit:** `normalize_test.ts`, `guess_match_test.ts`,
  `suggest_matches_test.ts`. Together they cover: NFD decomposition, punctuation
  set, whitespace collapsing, exact / startsWith / contains ranking, ordering
  stability, and gate behavior on empty / matching / non-matching input.
  `answer_suggestion_option_test.tsx` and `answer_input_test.tsx` cover the
  rendered ARIA state strings described above.
- **Manual:**
  - Type a normalized variant ("walle", "WALL-E", "Wall·E") and confirm Submit
    enables and answers score correctly.
  - Type a title that exists in the category but not in the current quiz —
    confirm Submit enables and the answer is recorded as `incorrect` against the
    active track.
  - On mobile, confirm the suggestion dropdown is reachable by tap and keyboard,
    that `Escape` dismisses it, and that the active option is scrolled into view
    as it changes.

## Open questions and known risks

- **No fuzzy matching.** Two answers that differ by one letter still count as
  different. If players complain about edge cases (subtitles, roman numerals,
  articles), a constrained Levenshtein pass _before_ the normalized equality
  check is the natural place to add it — but doing so would also widen the
  submit gate. Plan both sides at once.
- **Normalization performance.** Each render normalizes the full suggestion pool
  inside `suggestMatches`. Today's pools are short enough that this is not
  visible; if a category grows past a few thousand titles, precompute a
  normalized array once and reuse it.
