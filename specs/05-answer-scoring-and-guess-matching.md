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
  tap-outside dismissal, and sizing the suggestion popup against the space the
  on-screen keyboard leaves visible).

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
- A **tap** outside the container closes the dropdown: a press and release that
  both land outside it and travel no further than `TAP_SLOP` (10 px). A drag is
  a scroll, not a dismissal, and `pointercancel` (the browser taking the gesture
  over to scroll) never closes it. Closing on `pointerdown` instead would cancel
  a scroll-to-see-more gesture the instant the finger landed.
- Hover on an option pre-activates it so a subsequent click commits.
- Selected suggestions write the title back through `onValue`, which the parent
  (`QuizController`) routes to `answerDraft`.

#### Sizing the dropdown against the on-screen keyboard

The suggestion popup is absolutely positioned, so on a phone it is laid out in a
viewport the keyboard does not shrink. Under Chrome's default
`interactive-widget=resizes-visual`, and under every version of iOS Safari, the
keyboard shrinks only the **visual** viewport: the layout viewport keeps its
full height, the browser believes the popup is on screen, and `scrollIntoView`
finds nothing to do. A fixed `max-height` therefore ran the list under the
keyboard, and the hidden rows could only be reached by panning the page.

Two layers address this, and the second does not depend on the first:

1. **The page reflows where the platform allows it.** `src/routes/_app.tsx` sets
   `interactive-widget=resizes-content` on the viewport meta, so the keyboard
   shrinks the layout viewport and the page lays out above it. Chrome 108+ and
   Firefox 132+ honour the key; Safari ignores it entirely.
2. **The popup is measured against the space that is really visible.**
   `planSuggestionPopup` in
   [`src/lib/suggestionPopupLayout.ts`](../src/lib/suggestionPopupLayout.ts)
   takes the anchor's bounds and the visible band (`visualViewport.offsetTop`
   and `.height`, the only cross-browser signal for it) and returns a placement
   plus a `max-height`. The island applies that as an inline style, re-measuring
   on `visualViewport` `resize` / `scroll`, on window `resize`, and whenever the
   match list changes.

The popup hangs **below** the field and flips **above** only when that side has
strictly more room, so the common case keeps reading order. It never shrinks
below one option row (`MIN_POPUP_HEIGHT`), so a badly squeezed viewport gets a
short scrollable list rather than an invisible one. When `visualViewport` is
absent the band falls back to `document.documentElement.clientHeight`, which
makes the helper a no-op on desktop.

Rows past the cap are reached by scrolling **inside** the list, which now
genuinely overflows; `overscroll-behavior: contain` keeps that scroll from
chaining to the page.

Deliberately not done: no `scrollIntoView`-style nudge that lifts the field to
make room. The popup is absolutely positioned, so growing it grows the
document's scroll range, which moves the page, which re-triggers the
measurement, measured as a visible jump between placements before the idea was
dropped. Capping alone reaches the same settled layout without it.

#### Keeping Skip / Submit above the keyboard

Sizing the popup only fixes the popup. The Skip / Submit row sits _below_ the
field in the same card, so on a phone the keyboard can cover it whether or not
the dropdown is open, and on Chrome for Android the autofill accessory bar takes
another strip on top of that (see the risk below). A player who cannot see
Submit has no way to know it is there.

`QuizController` therefore keeps that row inside the visible band while the
answer field holds focus:

- `AnswerInput` reports focus and blur through `onFocusChange`, which on a phone
  is the same question as whether the keyboard is up. `TrackSuggestionForm`
  omits the prop, so the suggestion page is unaffected.
- `planVisibleBandScroll` in
  [`src/lib/visibleBand.ts`](../src/lib/visibleBand.ts) takes the band, the
  action row's bounds and the focused field's bounds, and returns how far to
  scroll. The clamp is the point: the nudge stops at the distance that would put
  the field's own top at the top of the band, so freeing the buttons can never
  hide the field being typed into. Zero means leave the page alone.
- The island applies the result with `scrollBy`, on focus and on
  `visualViewport` / window `resize`.

Two choices worth keeping:

- **Only resize re-runs it.** Following `visualViewport` `scroll` as well would
  re-nudge every time the player panned the page, which is a fight they should
  win.
- **The scroll is instant, not smooth.** It lands during the keyboard's own
  animation, where a second, slower animation reads as lag; an instant landing
  is invisible.

This depends on the document having somewhere to scroll to, which
`interactive-widget=resizes-content` guarantees on Chrome and Firefox by
reflowing the page into the shorter viewport. Under iOS Safari, where the layout
viewport keeps its full height, the nudge still runs but is limited by whatever
scroll range the document happens to have.

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
  - [`src/lib/suggestionPopupLayout.ts`](../src/lib/suggestionPopupLayout.ts):
    `planSuggestionPopup`; pure geometry, no DOM access, so the island can be
    fed measurements and the maths can be unit-tested.
  - [`src/lib/visibleBand.ts`](../src/lib/visibleBand.ts): the `VisibleBand` /
    `AnchorBounds` shapes both planners work in, `readVisibleBand` (the single
    DOM read, so every island measures the band the same way), and
    `planVisibleBandScroll`.
- **Islands (client)**
  - [`src/islands/AnswerInput.tsx`](../src/islands/AnswerInput.tsx) — combobox
    UI, keyboard handling, suggestion list rendering.
  - [`src/islands/QuizController.tsx`](../src/islands/QuizController.tsx) —
    Submit gating, scoring, popup result wiring (see spec 04), and the
    action-row nudge that keeps Skip / Submit inside the visible band.
- **Components (SSR)**
  - [`src/components/quiz/AnswerSuggestionOption.tsx`](../src/components/quiz/AnswerSuggestionOption.tsx)
    — single suggestion row, carrying the `aria-selected` string above.
  - [`src/routes/_app.tsx`](../src/routes/_app.tsx): the viewport meta carrying
    `interactive-widget=resizes-content`.
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
  - [`tests/unit/lib/suggestion_popup_layout_test.ts`](../tests/unit/lib/suggestion_popup_layout_test.ts)
    covers popup capping and flipping, against measurements taken from a phone
    with the keyboard raised.
  - [`tests/unit/lib/visible_band_scroll_test.ts`](../tests/unit/lib/visible_band_scroll_test.ts)
    covers the action-row nudge over the same phone profile: no scroll when the
    row is already visible, the clearance line, the clamp that protects the
    focused field, and the uncovered-viewport no-op.

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
  rendered ARIA state strings described above. `suggestion_popup_layout_test.ts`
  covers the popup geometry: capping to the room below the field, capping to the
  content when that is smaller, flipping above when that side has more room,
  staying below on a tie, the one-row floor, and the uncovered-viewport case.
  `visible_band_scroll_test.ts` covers the action-row nudge: the already-visible
  no-op, the clearance line, a row entirely below the band, the clamp that keeps
  the focused field on screen, and the case where freeing the row could only be
  bought by hiding the field. Those tests use measurements taken from a 412x915
  Android profile with the keyboard raised.
- **Manual:**
  - Type a normalized variant ("walle", "WALL-E", "Wall·E") and confirm Submit
    enables and answers score correctly.
  - Type a title that exists in the category but not in the current quiz —
    confirm Submit enables and the answer is recorded as `incorrect` against the
    active track.
  - On mobile, confirm the suggestion dropdown is reachable by tap and keyboard,
    that `Escape` dismisses it, and that the active option is scrolled into view
    as it changes.
  - **On a real phone with the on-screen keyboard raised** (this is the case the
    render-to-string harness cannot reach): type a query with more matches than
    fit, and confirm the list ends above the keyboard rather than under it, that
    dragging inside the list scrolls the list, and that dragging outside it
    scrolls the page without dismissing it. Worth doing on both an Android
    browser (which honours `interactive-widget`) and iOS Safari (which does
    not), because only the second exercises the `visualViewport` path on its
    own.
  - **On a real phone, with the field focused and no dropdown open:** confirm
    Skip and Submit are both fully on screen rather than under the keyboard, and
    that the answer field is still visible after the nudge. On Chrome for
    Android, do this with saved passwords / cards / addresses present so the
    autofill accessory bar is showing, since it takes a strip the page cannot
    remove and it is the case that motivated the nudge.

## Open questions and known risks

- **The autofill accessory bar is not ours to remove.** On Chrome for Android a
  bar of manual-fallback icons (passwords, payment methods, addresses) sits
  between the page and the keyboard. It is offered on any focused editable and
  is gated on whether _the viewer_ has saved data of each kind, not on anything
  about the field, so the answer field already carries the only lever a page
  has: `autocomplete="off"`, which Chrome deliberately ignores for autofill.
  Attribute tricks aimed at it (`autocomplete="new-password"`, randomized
  `name`s, `readonly`-until-focus) target value filling rather than the bar, and
  each would cost the field something for screen readers or password managers.
  Treat the strip as part of the keyboard: the nudge above is the response to
  it, not a workaround for it.
- **No fuzzy matching.** Two answers that differ by one letter still count as
  different. If players complain about edge cases (subtitles, roman numerals,
  articles), a constrained Levenshtein pass _before_ the normalized equality
  check is the natural place to add it — but doing so would also widen the
  submit gate. Plan both sides at once.
- **Normalization performance.** Each render normalizes the full suggestion pool
  inside `suggestMatches`. Today's pools are short enough that this is not
  visible; if a category grows past a few thousand titles, precompute a
  normalized array once and reuse it.
