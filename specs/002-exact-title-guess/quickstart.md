# Quickstart: Verify 002-exact-title-guess

**Date**: 2025-03-26

## Prerequisites

- Local app running (`deno task dev` or project-standard dev command).
- A category with **≥20** tracks and **at least one** distinct title that can
  appear in suggestions but **not** in a specific quiz draw (optional but useful
  for the “full pool” case).

## Automated

```bash
deno task check
deno test -A tests/
```

(After implementation: ensure new unit tests for `guessMatchesSuggestionPool` /
equivalent pass.)

## Manual checks (mobile viewport)

1. **Non-match**: Open a quiz, type gibberish that will not normalize to any
   real title. **Submit** must stay **disabled** (and must not submit if somehow
   invoked).
2. **Normalized match**: Type a title using different **case** or
   **punctuation** that still matches a suggestion per `normalizeAnswer` (e.g.
   extra spaces where `normalizeAnswer` collapses them). **Submit** must become
   **enabled**.
3. **Whitespace only**: Only spaces in the field → **Submit** disabled.
4. **Full pool, not in current 20** (if you can identify such a title in the
   datalist): Pick a valid suggestion title that is **not** the answer for the
   current track. **Submit** enabled → after submit, result should be
   **incorrect** (existing scoring), confirming gating ≠ “correct for this
   track”.
5. **Skip** still works when answer not locked.
6. **Affordance (US2)**: With non-matching text in the field, confirm the hint
   below the input (“Match a suggested title…”) and the Submit button’s native
   tooltip (`title`) explain why Submit stays disabled.

## Regression

- Correct answer for the **active** track still scores **correct** when typed in
  a normalized-matching form.
- localStorage progress and replay limits behave as before.
