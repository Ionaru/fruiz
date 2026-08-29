# 07 — Player collections

> Authenticated players accumulate a personal collection of correctly-guessed
> tracks. The collection page lists them grouped by category, and the mid-quiz
> result modal shows progress toward "all tracks collected in this category".

## Purpose

This subsystem owns:

- The `collected_tracks` table that links a user to a track.
- The `/api/collection/:id` POST endpoint that records a successful guess.
- The `/collection` page that lists collected tracks with category rollups.
- The "X left to collect" line surfaced inside `GuessResultModal` after a
  correct guess.

Account authentication lives in spec 08. Track CRUD lives in spec 09. Submission
scoring lives in spec 05.

## Behavior

### Recording a collection entry

When `QuizController` records a `correct` answer for a track and the player is
logged in (`props.loggedIn`), it fires a fire-and-forget
`POST /api/collection/<trackId>?categorySlug=<slug>` (see spec 04).

[`src/routes/api/collection/[id].ts`](../src/routes/api/collection/[id].ts):

1. Reject `401 Unauthorized` when no user is on the session.
2. Reject `404 Not Found` when the `:id` parameter is missing or no track row
   exists.
3. Insert `(userId, trackId, collectedAt = now)` into `collected_tracks` with
   `ON CONFLICT DO NOTHING`. The composite PK `(user_id, track_id)` makes the
   insert idempotent.
4. Read the optional `?categorySlug=` query and call
   `getCategoryCollectionStats(db, userId, categorySlug)` to compute the "X
   collected of Y total" progress for that category.
5. Respond with:
   - `201 Created` and `{ status: "created", progress }` when the row was newly
     inserted.
   - `200 OK` and `{ status: "existed", progress }` when the row was already
     present.

The progress payload (when included) is `{ categoryName, collected, total }`.
`formatCategoryProgressLine` (`src/lib/collectionProgress.ts`) renders it as
either `"All N collected in <category>!"` or
`"X left to collect in <category>."`.

The client treats the response as advisory. The popup result is shown
regardless; the network call only enriches the modal with the collection
progress line once it resolves.

### Collection page

`/collection` (handler in
[`src/routes/collection.tsx`](../src/routes/collection.tsx)):

1. Redirect to `/account` if there is no logged-in user.
2. Run three queries in parallel:
   - `getCollectionCatalog(db, userId)` — **every** categorized track in title
     order, each flagged with whether this player has collected it. The page
     lists uncollected tracks as locked slots, so it needs the whole corpus and
     not only what has been collected. Uncategorized tracks are excluded, which
     keeps the list agreeing with the denominator below.
   - `getCollectionStatsForAllCategories(db, userId)` — per-category `collected`
     / `total`, including categories nothing has been collected from.
   - `getCategorizedTrackCount(db)` — total number of distinct tracks that
     belong to at least one category (denominator for the global count).
3. Project the catalog with `toCollectionEntries` into `CollectionEntry[]`, and
   build `categories: CategoryFilterOption[]` and
   `allTotals: {collected,
   total}`.
4. Render with `CollectionView` (island) when there is anything to collect,
   otherwise show an empty-state plateau card.

The [`CollectionView`](../src/islands/CollectionView.tsx) island lets the user
filter by category, search their collected titles, and play whole tracks on
demand. Playback uses the same `AudioPlayer` island as the quiz page (spec 06),
in its row layout and with pause/resume rather than stop-and-rewind.

#### Serialization contract

`CollectionEntry` is a discriminated union
([`src/lib/collectionEntries.ts`](../src/lib/collectionEntries.ts)):

- `{ kind: "collected", id, title, letter, categories, playbackGain* }`
- `{ kind: "locked", letter, categories }`

**Invariant: a title is serialized only for tracks this player has collected,
and `audioUrl` is never serialized at all.** A locked slot keeps its position in
the ordered array and its divider letter — that is what makes a letter group
read as a set with gaps — but carries no title and no id. Its categories travel
because the filter needs them, and neither they nor the position identify the
track.

The ordering does reveal roughly where an uncollected track sorts. That leaks
nothing new: `src/routes/quiz/[category]/[slug]/index.tsx` already ships every
title in a category to the browser as `titleSuggestions` (via
`getDistinctTitlesForCategory`) so the answer autocomplete can work. Sending a
title _here_ would still be wrong, because the locked slot's whole job is to
mark a gap without naming what fills it.

`toCollectionEntries` is the boundary, and
`tests/unit/lib/collection_entries_test.ts` asserts over `JSON.stringify` that
no uncollected title survives it.

#### Search, filters, and locked slots

- Search runs client-side over collected titles, normalized with
  `normalizeAnswer` — the same normalization as guess scoring, so searching
  behaves the way answering does.
- **An active query hides every locked slot.** They have no title to match, and
  leaving 126 identical "Not collected yet" cards among three real hits would
  bury the results. A line under the field says so when it applies.
- Letter dividers survive filtering; emptied groups are dropped. Nothing is
  reordered, so a track stays where the reader already knows it lives.
- Category and search compose as AND. The filter counts describe the collection,
  not the current result set, so they do not move as you type.
- Only one row plays at a time: `CollectionView` owns `nowPlayingId` and
  `AudioPlayer.activePlayerId` stops every other row. Being preempted always
  rewinds, even though this page opts into pause — pausing is a choice the
  listener makes, not something starting another track should scatter down the
  list.

### Collection progress on the main menu

The home page shows how far along each category's collection is, so a player can
see where there is still something to win before picking a quiz.

- The handler calls `getCollectedCountsBySlug(db, userId)` only when a user is
  signed in, and passes `null` otherwise. A guest's category cards render no bar
  and no collected count — there is no collection to measure.
- The menu reads `getCollectionStatsForAllCategories` (every category with
  tracks, `collected: 0` included), as the collection page now does too. A
  category missing from the map is treated as zero rather than as "unknown", so
  a newly seeded category shows an empty bar instead of silently dropping its
  progress row.
- The denominator is the category's whole pool
  (`AvailableQuizOption.totalTrackCount`), which is also what hard mode plays —
  not the easy subset.

### Mid-quiz progress popup

When the collection POST returns `201 Created`, `QuizController` updates
`popupResult.newCollectionAdd = true` and stores the optional `progress`
payload. The `GuessResultModal` then renders the "+ added to your collection"
line plus the formatted progress line.

If the response is `200 OK` (duplicate), the modal does not show the "added"
hint — the player has already collected that track in a previous session.

### Edge cases

- **Anonymous players.** No POST is fired. The popup result simply shows the
  standard correct / incorrect outcome.
- **Track deleted between quiz creation and answer.** The track id resolves to
  no row in `tracks` → `404 Not Found`. The popup still shows the standard
  outcome.
- **Category not provided on POST.** Without `?categorySlug=`, the `progress`
  field is `null` and the modal only shows the "added" line.
- **Categories with zero collected tracks are kept.** They used to be filtered
  out of the collection page's rollup, on the grounds that an always-empty
  filter was dead weight. Locked slots reverse that: a `0 / 52` category is now
  the most informative filter on the page, because selecting it shows exactly
  what there is to win. `getCollectionStatsByCategory` existed only to apply
  that filter and has been removed.
- **A track in no category at all** appears nowhere: `getCollectionCatalog`
  drops it, matching `getCategorizedTrackCount`, so the list length and the
  totals cannot disagree.
- **Track in multiple categories.** A single `collected_tracks` row counts
  toward each category's `collected` total because the join expands per category
  membership. `SELECT DISTINCT` in the aggregates keeps the totals correct.

## Data model

[`src/db/schema.ts`](../src/db/schema.ts):

- **`collected_tracks`** — composite PK on `(user_id, track_id)`, `collected_at`
  timestamp. Both FKs cascade delete: a user account deletion removes the user's
  collection; a track deletion removes every reference from every collection.

Application types:

- [`src/lib/collectionProgress.ts`](../src/lib/collectionProgress.ts) —
  `CategoryCollectionProgress`, `formatCategoryProgressLine`.
- [`src/lib/collections.ts`](../src/lib/collections.ts) —
  `getCategoryCollectionStats`, `CategoryCollectionStatsRow`,
  `getCollectionStatsForAllCategories`, `getCollectionCatalog`,
  `getCollectedCountsBySlug`, `getCategorizedTrackCount`.
- [`src/lib/collectionEntries.ts`](../src/lib/collectionEntries.ts) —
  `CollectionEntry` (`CollectedEntry` | `LockedEntry`), `LetterSection`,
  `CatalogTrack`, `toCollectionEntries`, `groupLetterForTitle`,
  `filterCollectionEntries`, `groupIntoLetterSections`.
- [`src/components/collection/CategoryFilterList.tsx`](../src/components/collection/CategoryFilterList.tsx)
  — `CategoryFilterOption`.

## Key files

- **Server-only**
  - [`src/lib/collections.ts`](../src/lib/collections.ts).
  - [`src/lib/collectionProgress.ts`](../src/lib/collectionProgress.ts).
- **Shared (server projects, browser renders)**
  - [`src/lib/collectionEntries.ts`](../src/lib/collectionEntries.ts) — the
    `CollectionEntry` union, `toCollectionEntries` (the privacy boundary),
    letter grouping, search matching, and filtering.
- **Routes**
  - [`src/routes/api/collection/[id].ts`](../src/routes/api/collection/[id].ts)
    — POST endpoint.
  - [`src/routes/collection.tsx`](../src/routes/collection.tsx) — listing page.
  - [`src/routes/index.tsx`](../src/routes/index.tsx) — main menu; reads the
    per-category collected counts for signed-in players.
- **Islands (client)**
  - [`src/islands/CollectionView.tsx`](../src/islands/CollectionView.tsx).
  - [`src/islands/AudioPlayer.tsx`](../src/islands/AudioPlayer.tsx) — row
    layout, pause/resume, elapsed time, single-player preemption (spec 06).
  - [`src/islands/GuessResultModal.tsx`](../src/islands/GuessResultModal.tsx) —
    consumes the progress payload.
  - [`src/islands/QuizController.tsx`](../src/islands/QuizController.tsx) —
    fires the POST.
- **Components (SSR)**
  - `src/components/collection/` — `CollectionProgressPanel`,
    `CollectionSearchField`, `CategoryFilterList`, `CategoryFilterButton`,
    `CollectionLetterDivider`, `CollectionTrackLabel`, `CollectionLockedItem`,
    `CollectionEmptyNotice`.
  - [`src/components/quiz/QuizCategoryCard.tsx`](../src/components/quiz/QuizCategoryCard.tsx)
    — renders the menu's per-category progress.
- **Tests**
  - [`tests/unit/lib/collections_test.ts`](../tests/unit/lib/collections_test.ts)
    — rollup behavior, filtering, totals.
  - [`tests/unit/lib/collection_stats_test.ts`](../tests/unit/lib/collection_stats_test.ts)
    — per-player isolation of the counts.
  - [`tests/unit/lib/collection_catalog_test.ts`](../tests/unit/lib/collection_catalog_test.ts)
    — the catalog read: no duplicate row for a multi-category track,
    uncategorized tracks excluded, no cross-player leakage.
  - [`tests/unit/lib/collection_entries_test.ts`](../tests/unit/lib/collection_entries_test.ts)
    — grouping, search, filtering, and the serialization invariant.
  - `tests/unit/components/collection_*.tsx` — the row states, the filters, the
    progress panel, and the search field.
  - [`tests/unit/components/quiz_category_card_test.tsx`](../tests/unit/components/quiz_category_card_test.tsx)
    — progress shown for players, absent for guests.

## Constraints and invariants

- **Authentication is required.** The collection POST returns `401` for guests;
  the page redirects guests to `/account`. The quiz route itself stays
  guest-friendly (anonymous players can still play).
- **Idempotent inserts.** `ON CONFLICT DO NOTHING` guarantees that repeated
  correct guesses do not duplicate entries.
- **Progress is read-only data, not authority.** The category progress line
  shows the player a count; the score and quiz state remain owned by
  `QuizController`.
- **Cross-category counting honours `DISTINCT`.**
  `count(distinct
  trackCategories.trackId)` and
  `count(distinct
  collectedTracks.trackId)` MUST be used because the join
  expands rows. Removing the `DISTINCT` clauses produces inflated totals.
- **Principle II — Server-first data boundaries.** All collection state lives in
  SQLite; the client only receives the projected page payload and the per-modal
  progress reply.

## Verification approach

- **Unit:** the stats helpers and totals (`collections_test.ts`,
  `collection_stats_test.ts`); the catalog read against an in-memory SQLite
  database (`collection_catalog_test.ts`); grouping, search, filtering and the
  serialization invariant (`collection_entries_test.ts`); and the collection's
  SSR components (`tests/unit/components/collection_*.tsx`).
- **Integration:** none directly. Authentication is exercised by
  `admin_auth_test.ts` and `session_logout_test.ts` (spec 08).
- **Manual:** `AudioPlayer` has no automated harness, so the playback changes
  are validated by hand. On a phone first (Principle III):
  - Sign in, play a quiz, answer correctly — confirm the modal shows the "added
    to collection" line plus the category progress line.
  - Sign out, play a quiz, answer correctly — confirm no network call fires.
  - Visit `/collection` while signed in — confirm titles are in alphabetical
    order with locked slots at their true positions, every category is offered
    as a filter (including one with nothing collected), and collected + hidden
    equals the total.
  - Play a row — the glow, the inline waveform and the elapsed time appear, and
    the control becomes Pause. Pause and resume — playback continues from where
    it stopped. Start a second row — the first stops **and rewinds**, and only
    one track is audible.
  - Search — locked slots disappear, dividers survive, and a query that matches
    nothing offers a way back out.
  - **Confirm the quiz is unchanged**: stopping a clip still rewinds to the clip
    start, and replay limits still count. This is the regression the pause work
    would most plausibly cause.
  - Toggle the OS colour scheme — the design was drawn dark-only, so light mode
    is the state most likely to have been missed.
  - Sign in on a second device — confirm the collection page reflects
    cross-device server state (no per-device caching).

## Open questions and known risks

- **Collection growth.** The page now renders a row for every categorized track,
  not only the collected ones, so the rendered row count is the size of the
  whole corpus regardless of how much a player has collected. Pagination or
  virtual scrolling therefore becomes necessary sooner than it would have. The
  payload's bulk is the category-name strings repeated on every entry; interning
  them into a shared array, and merging runs of consecutive locked slots, are
  the levers to pull before anything more elaborate.
- **A headless playback engine.** `AudioPlayer` now carries a row layout as well
  as its default stack, because the audio graph, the play state and the analyser
  all have to live in one island. If a third arrangement ever appears, extract
  the engine into a module both can consume rather than adding a third layout.
- **Privacy.** Collections are private to the user today. If the product later
  adds public profiles, decide what is shown (collection size? category
  progress? specific titles?) and gate the new endpoints accordingly.
- **Hard-deleted tracks vs. collection memory.** Today a track deletion cascades
  and removes the row from every user's collection. If the product wants to
  preserve the historical fact "you collected this track" even after the track
  is removed, the cascade rule needs to change to a soft-delete strategy.
