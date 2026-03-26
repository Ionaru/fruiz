# Data Model Notes: 002-exact-title-guess

**Date**: 2025-03-26

This feature introduces **no new tables or columns**.

## Existing entities (relevant)

| Concept                  | Source                                                | Notes                                                                                                                                   |
| ------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Category**             | `categories`                                          | Scoped by slug in quiz URL.                                                                                                             |
| **Track**                | `tracks`                                              | Has `title`; many tracks may share the same display title.                                                                              |
| **Track–category link**  | `track_categories`                                    | Defines which tracks belong to a category pool.                                                                                         |
| **Quiz instance tracks** | Deterministic selection (`selectTracksDeterministic`) | Exactly 20 tracks per quiz; subset of pool.                                                                                             |
| **Suggestion list**      | `getDistinctTitlesForCategory(db, categoryId)`        | **Distinct** `tracks.title` values for all tracks in the category (ordered). Hydrated as `titleSuggestions: string[]` on the quiz page. |

## Runtime-only (client)

| Concept                | Location                                 | Notes                                                                                             |
| ---------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Guess input**        | `answerDraft` signal in `QuizController` | Raw string; compared via `normalizeAnswer`.                                                       |
| **Submit eligibility** | Derived boolean                          | True iff non-empty (after trim) and matches ≥1 suggestion title under `normalizeAnswer` equality. |

## Invariants

- **Quiz identity** is unchanged: still determined by category slug + encoded
  slug (difficulty + seed).
- **Scoring** still compares normalized guess to **active track’s** `title`
  only; gating only controls **whether** submit is allowed, not the score rule.
