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
   - All `collected_tracks` rows for the user, ordered by `collectedAt desc`,
     joined to `tracks` and `categories` (track columns plus category names for
     chips).
   - `getCollectionStatsByCategory(db, userId)` — aggregate rollup filtered to
     categories where the user has collected at least one track.
   - `getCategorizedTrackCount(db)` — total number of distinct tracks that
     belong to at least one category (denominator for the global count).
3. Build the page data: `tracks: CollectionTrack[]`,
   `categoryCounts:
   Record<categoryName, {collected, total}>`, and
   `allTotals: {collected, total}`.
4. Render with `CollectionView` (island) when the collection is non-empty,
   otherwise show an empty-state plateau card.

The [`CollectionView`](../src/islands/CollectionView.tsx) island lets the user
filter tracks by category, search within the collection, and play clips on
demand. Playback uses the same `AudioPlayer` island as the quiz page (spec 06).

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
- **`getCollectionStatsByCategory` filters categories with zero collected.** The
  rollup only includes categories where the user has at least one collected
  track; the all-categories total comes from `getCategorizedTrackCount`
  separately.
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
  `getCollectionStatsByCategory`, `getCategorizedTrackCount`.
- [`src/routes/collection.tsx`](../src/routes/collection.tsx) —
  `CollectionTrack`, `CategoryCount`.

## Key files

- **Server-only**
  - [`src/lib/collections.ts`](../src/lib/collections.ts).
  - [`src/lib/collectionProgress.ts`](../src/lib/collectionProgress.ts).
- **Routes**
  - [`src/routes/api/collection/[id].ts`](../src/routes/api/collection/[id].ts)
    — POST endpoint.
  - [`src/routes/collection.tsx`](../src/routes/collection.tsx) — listing page.
- **Islands (client)**
  - [`src/islands/CollectionView.tsx`](../src/islands/CollectionView.tsx).
  - [`src/islands/GuessResultModal.tsx`](../src/islands/GuessResultModal.tsx) —
    consumes the progress payload.
  - [`src/islands/QuizController.tsx`](../src/islands/QuizController.tsx) —
    fires the POST.
- **Components (SSR)**
  - [`src/components/collection/CategoryFilterButton.tsx`](../src/components/collection/CategoryFilterButton.tsx),
    [`src/components/collection/CollectionTrackItem.tsx`](../src/components/collection/CollectionTrackItem.tsx).
- **Tests**
  - [`tests/unit/lib/collections_test.ts`](../tests/unit/lib/collections_test.ts)
    — rollup behavior, filtering, totals.

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

- **Unit:** `collections_test.ts` for the stats helpers and totals.
- **Integration:** none directly. Authentication is exercised by
  `admin_auth_test.ts` and `session_logout_test.ts` (spec 08).
- **Manual:**
  - Sign in, play a quiz, answer correctly — confirm the modal shows the "added
    to collection" line plus the category progress line.
  - Sign out, play a quiz, answer correctly — confirm no network call fires.
  - Visit `/collection` while signed in — confirm the list orders newest first,
    the rollup hides categories with zero collected tracks, and the "all tracks
    collected" message appears when a category is complete.
  - Sign in on a second device — confirm the collection page reflects
    cross-device server state (no per-device caching).

## Open questions and known risks

- **Collection growth.** The page query joins each collected track to its full
  category list. For a user with thousands of collected tracks this could grow;
  add pagination or virtual scrolling before that becomes a problem.
- **Privacy.** Collections are private to the user today. If the product later
  adds public profiles, decide what is shown (collection size? category
  progress? specific titles?) and gate the new endpoints accordingly.
- **Hard-deleted tracks vs. collection memory.** Today a track deletion cascades
  and removes the row from every user's collection. If the product wants to
  preserve the historical fact "you collected this track" even after the track
  is removed, the cascade rule needs to change to a soft-delete strategy.
