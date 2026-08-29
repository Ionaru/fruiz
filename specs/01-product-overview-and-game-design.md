# 01 — Product overview and game design

> A mobile-first, server-rendered web app where players identify films, TV
> shows, and games from short music fragments. Quizzes are deterministic and
> shareable as URLs, curated through an admin panel, and protected by passkey
> authentication.

## Purpose

This spec sits at the top of the spec set. It captures _what_ the product is —
the concept, glossary, game rules, design principles, and the high-level stack
choices that constrain the implementation. It does **not** describe how any
particular subsystem works; behavioral detail lives in specs 02–10.

## Behavior

### Concept

The app is a music-guessing game built around a tight core loop:

1. The player opens the home page and chooses a category + difficulty.
2. The app generates a 3-character code, encodes it together with the difficulty
   into a path slug, and navigates to `/quiz/{category}/{slug}`.
3. A 20-track quiz loads. All 20 tracks are available from the start; tracks may
   be answered in any order.
4. For each track: the player triggers playback, types into the answer field
   (category-scoped autocomplete), then submits an answer or skips to revisit
   later.
5. The quiz ends automatically when every track has been answered. The results
   screen shows the final score, a per-track breakdown, a "Challenge a friend"
   action that opens a share popup with a copy-ready challenge message (final
   score plus the shareable quiz link), and a "Play a new quiz" action that
   starts a fresh quiz in the same category and difficulty.

The shareable URL (path only) fully reproduces the quiz on any device. Personal
preferences (replay limit, local progress) attach to the device and do not
change the track list.

### Glossary

| Term             | Definition                                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Player**       | A visitor taking a quiz.                                                                                                                              |
| **User**         | An authenticated visitor with an account (may also be an admin).                                                                                      |
| **Admin**        | A user whose `users.admin = true`; can manage tracks, categories, and audio uploads.                                                                  |
| **Track**        | A short audio fragment from a film, TV show, or game soundtrack.                                                                                      |
| **Title**        | The name of the work a track is from. Multiple tracks may share a title.                                                                              |
| **Category**     | A named group of tracks (e.g. Disney, Video Games). Tracks may belong to many categories.                                                             |
| **Round**        | One step in a quiz: one track, one submitted guess.                                                                                                   |
| **Quiz**         | A persisted sequence of 20 rounds determined by category + difficulty + 3-char code.                                                                  |
| **Code**         | The short string (3 characters from `0–9A-Z`) that identifies one quiz within a `(category, difficulty)` pair.                                        |
| **Difficulty**   | A per-track label (`easy` / `hard`) chosen by admins. Players pick `easy` (easy-labeled tracks only) or `hard` (the whole pool) when starting a quiz. |
| **Replay limit** | A player-local cap on how often a track can be replayed before the player must answer or skip. `0` means unlimited.                                   |
| **Collection**   | A user's personal saved set of tracks. Used to study or revisit specific titles.                                                                      |
| **Passkey**      | A WebAuthn credential bound to the user's device. Used for both registration and discoverable (no-username) login.                                    |

### Product goals

1. Deliver a fast, mobile-friendly music quiz.
2. Make every quiz shareable by URL with no loss of identity.
3. Support multiple categories and difficulties from real curated content.
4. Provide a passkey-only admin surface for content management — no passwords.
5. Lay the groundwork for player accounts (collections, future leaderboards)
   without coupling them to quiz identity.

### Out of scope (initial release)

- Persistent player leaderboards.
- Multiplayer / synchronized rooms.
- Commercial hosting.
- Player-facing rate limiting beyond what the deployment provides.
- Account or passkey recovery flows.

### Game rules

- A quiz contains **exactly 20 tracks**. This is fixed.
- A `(category, difficulty)` pair is only offered to players when at least 20
  eligible tracks exist; otherwise the option is hidden on the home page.
- One guess per track. Submitted answers are terminal — `correct` / `incorrect`
  cannot revert to `unanswered` or `skipped`.
- A skipped track is still incomplete; the quiz only ends when every track has a
  terminal status.
- Scoring is `+1` for a correct answer and `0` otherwise. Maximum score is 20.
- The autocomplete suggestion list is **category-scoped** and includes titles
  that are not in the current 20-track quiz. The player MUST select from the
  suggestion pool — freeform answers are not accepted.
- Answer comparison is normalized: lowercase, trim, drop punctuation, collapse
  whitespace. The same rule is used for both submit eligibility and scoring (see
  spec 05).

### Main menu

The home page is the only screen a player has to understand before they can
play, so it answers three questions in order: what can I carry on with, what can
I start, and what does each difficulty actually mean.

- **Sections.** `Resume` (only when the browser holds saved progress) and
  `Start new quiz`, each introduced by a quiet small-caps heading. The cards
  carry the weight; the headings only say which group you are looking at. Both
  sections separate their heading from their content with the section's own
  `gap`, and the heading carries no margin utility of its own. `space-y-*` is
  emitted as a zero-specificity `:where()` rule, so a margin class on a child
  silently cancels it; `gap` cannot be overridden that way.
- **Category card.** The category name with its whole pool beside it
  (`52 tracks`). Signed-in players also get a collection progress bar and a
  collected count for that category; signed-out visitors get neither, having no
  collection to measure against.
- **Difficulty.** Two equal-width buttons filling the card. The word `Easy` /
  `Hard` carries the colour, backed by a softened halo — a strong glow behind
  two adjacent full-width buttons bleeds from one into the other. Easy states
  the size of its own pool (`32 well-known tracks`) because that is the number
  that differs; hard reads `All tracks` rather than repeating the total already
  printed at the top of the card. The narrower autocomplete pool easy also
  applies (spec 02) is deliberately not spelled out here — it is a detail that
  matters while playing, not while choosing.
- **Signed-out visitors** see a strip under the header explaining what an
  account buys ("keep every track you guess right in a collection"). The sign-in
  action itself stays in the header, so the strip only has to persuade.
- **Layout.** One column on phones, with `Resume` above `Start new quiz`. From
  the `lg` breakpoint the menu widens and splits: categories two-up on the left,
  resume in a fixed side column. Source order follows the phone, since that is
  the design baseline.

### Mobile design baseline

- Single-column layouts under phone widths.
- Touch-friendly targets; no hover-only interactions.
- Audio playback waits for a user gesture (iOS/Android requirement).
- The copy action in the "Challenge a friend" popup MUST work with the mobile
  clipboard API and MUST show visible feedback for both the copied and failed
  outcomes.
- ARIA labels are only added when semantic HTML cannot communicate the role.
  Icon-only controls (such as the site header destinations) carry a
  visually-hidden text label rather than an `aria-label`, so the accessible name
  never depends on CSS media state.
- Color contrast on status indicators MUST be sufficient for outdoor screens.

### Future possibilities

| Theme             | Examples                                                            |
| ----------------- | ------------------------------------------------------------------- |
| Multiplayer       | Synchronized rooms, shared scoreboards.                             |
| Leaderboards      | Per-category daily ranks, all-time bests, friend boards.            |
| Content expansion | More categories, community submissions, difficulty re-ratings.      |
| Analytics         | Completion rates, average scores, category popularity (admin-only). |
| Branding / OG     | Dynamic per-quiz Open Graph images.                                 |

## Data model

Game-level concepts only — implementation details live in the subsystem specs.

- **Quiz identity:** `(categorySlug, difficulty, code)` — fully encoded in the
  path. See spec 02.
- **Quiz settings:** `replayLimit` (player-local, query param). See spec 04.
- **Quiz progress:** device-local store keyed by quiz path. See spec 04.
- **Account:** username + admin flag + one-or-more passkeys + one-or-more
  sessions. See specs 08 and 10.
- **Collection:** authenticated user → many tracks. See spec 07.

## Key files

- [`src/main.ts`](../src/main.ts) — Fresh app entry; wires `staticFiles()`,
  `trailingSlashes("never")`, and `app.fsRoutes()`.
- [`src/routes/index.tsx`](../src/routes/index.tsx) — home page; starts a new
  quiz, lists in-progress quizzes, and links to account / collection.
- [`src/components/layout/SiteHeader.tsx`](../src/components/layout/SiteHeader.tsx):
  the site header rendered on every page, holding the logo, the wordmark, and
  the session-aware home / collection / admin / account destinations. Which
  destinations a visitor sees depends on their session but never on the page
  they are on, so the bar does not reshuffle while navigating. The only
  exceptions are the destinations that would link to the current page: home is
  dropped on the home page, and a guest's "Sign in" call to action is dropped on
  `/account`, which is where it points.
- [`src/components/layout/SignInPromptStrip.tsx`](../src/components/layout/SignInPromptStrip.tsx)
  — what an account buys, shown to guests in place of the collection
  destination.
- [`src/components/quiz/QuizCategoryCard.tsx`](../src/components/quiz/QuizCategoryCard.tsx),
  [`src/components/quiz/StartNewQuizSection.tsx`](../src/components/quiz/StartNewQuizSection.tsx)
  — category-and-difficulty picker.
- [`src/components/quiz/glow.ts`](../src/components/quiz/glow.ts) — the
  difficulty halos: softened on the menu's paired buttons, strong on quiz
  results, rainbow for hard on the player header.
- [`src/components/ui/SectionHeading.tsx`](../src/components/ui/SectionHeading.tsx),
  [`src/components/ui/ProgressBar.tsx`](../src/components/ui/ProgressBar.tsx) —
  the menu's small-caps section labels and its hairline progress indicator,
  which also reports answered-question progress on a resumable quiz.
- [`deno.json`](../deno.json) — stack and task definitions (`deno task dev`,
  `build`, `start`, `check`, `test`, `db:sync`, `playback-gain:backfill`,
  `update`).

## Constraints and invariants

This spec inherits all seven principles from `AGENTS.md`. The two that most
shape the product framing are:

- **Principle I — Deterministic quiz identity.** The shareable URL is the
  promise of the product. If a player-local preference ever changes which tracks
  load, that is a bug, not a feature.
- **Principle III — Mobile-first playability.** Every new player-facing change
  is designed and validated on a phone-sized viewport before being declared
  done.

## Verification approach

There is no automated test for this overview document. Verification is by
review: every other spec must be consistent with the glossary and rules here.
When a rule changes (e.g. quiz size, scoring, autocomplete behavior), this spec
MUST be updated in the same change that updates the subsystem spec.

## Open questions and known risks

- **Audio URL obfuscation.** Today the audio URL is straightforwardly fetched
  from `/api/listen/[id]`. A future hardening would scramble or sign listen URLs
  so network inspection cannot pre-identify tracks.
- **Code space size.** A 3-character `0–9A-Z` code yields 36³ = 46 656
  possibilities per `(category, difficulty)` pair. That is enough to keep
  collisions rare for any realistic library size but small enough to enumerate
  if someone wanted to brute-force every quiz; if this becomes a concern, widen
  the code length in `src/lib/slug.ts`.
