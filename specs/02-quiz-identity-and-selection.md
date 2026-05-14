# 02 — Quiz identity and selection

> Quiz identity is the `(categorySlug, difficulty, code)` triple encoded in the
> URL path. Given that triple, the server produces (or retrieves) a stable
> 20-track quiz that is shared identically across every player and device.

## Purpose

This subsystem owns:

- The shape and encoding of the shareable quiz path.
- The deterministic algorithm that selects the 20 tracks for a quiz.
- The persisted `quiz_instances` + `quiz_instance_tracks` snapshot tables that
  keep a quiz stable even as the underlying track library changes.
- Category eligibility (a `(category, difficulty)` pair is only offered when at
  least 20 eligible tracks exist).

Player-local state (replay limit, progress) lives in spec 04. Audio file
storage, listen URLs, and clip windowing live in spec 03. Answer matching lives
in spec 05.

## Behavior

### URL shape

The shareable path is `/quiz/{categorySlug}/{slug}`, where `slug` is:

```
<difficulty-char><code>
```

| Segment             | Source                                     | Values                                 |
| ------------------- | ------------------------------------------ | -------------------------------------- |
| `categorySlug`      | `categories.slug` (DB)                     | Free-form slug; created by admins.     |
| `<difficulty-char>` | `DIFF_PREFIX` in `src/lib/slug.ts`         | `e` = easy · `h` = hard · `m` = mixed. |
| `<code>`            | `generateShortCode()` in `src/lib/slug.ts` | Exactly 3 characters from `0-9A-Z`.    |

Decoding (`decodeSlug`) rejects any slug shorter than 2 characters, any unknown
difficulty prefix, and any code that does not match `^[0-9A-Z]{3}$`.

### Selection algorithm

For `(categorySlug, difficulty, code)`:

1. Load the category by slug. Missing → redirect to `/`.
2. Look up an existing `quiz_instances` row for that
   `(categorySlug,
   difficulty, code)` triple.
3. **If found:** join the matching `quiz_instance_tracks` rows back to `tracks`
   (left join, ordered by `position`) and project a payload. Tracks that have
   since been deleted appear with `unavailable: true` and the snapshotted title
   suffixed `(Unavailable)`. The quiz is otherwise stable.
4. **If not found:** fetch all tracks in the category, filter by difficulty
   (`easy` / `hard` / no filter for `mixed`), then run
   `selectTracksDeterministic`:
   - Hash the `code` string to a 32-bit seed (djb2 in `seedStringToUint32`).
   - Seed `mulberry32` with that integer.
   - Fisher–Yates shuffle the filtered pool, then take the first 20.
   - If fewer than 20 remain, return `null` and the route redirects to `/`.
   - Persist a `quiz_instances` row and 20 ordered `quiz_instance_tracks` rows,
     snapshotting `tracks.title` at the time of creation.
5. On a unique-index conflict (two simultaneous creates), re-read with
   `getQuizInstance` and serve the row that won.

### Edge cases and redirects

- **Invalid `categorySlug`**, **invalid slug format**, **eligible track count
  below 20** at create time → redirect to `/` with a 302. The player lands on
  the home page rather than seeing a broken quiz screen.
- **Track deleted after quiz creation**: the round persists with
  `unavailable: true`; the player sees the snapshotted title and cannot answer
  that round (handled in spec 04).
- **`(category, difficulty)` pair drops below 20 tracks after quiz creation**:
  existing quizzes keep their snapshotted rounds. Only future quiz creation is
  blocked by eligibility checks.
- **Category eligibility**: the home page only offers a
  `(category,
  difficulty)` pair when `loadCategoryTrackCounts` reports at
  least 20 eligible tracks for that difficulty. `mixed` uses the full pool
  count; `easy` / `hard` use the per-difficulty count.

### Determinism

For the same `(categorySlug, difficulty, code)` triple:

- The same shuffled list is produced (deterministic shuffle from a
  string-derived seed).
- After the first request, the persisted snapshot guarantees the same list even
  if the underlying track pool changes.
- The `replayLimit` query parameter, `localStorage` progress, and any
  authenticated session **MUST NOT** influence selection at any stage.

## Data model

### Tables (`src/db/schema.ts`)

- **`tracks`** — `id` (UUID), `title`, `audio_url`, `difficulty` (`easy` /
  `hard`), playback gain + clip fields (see spec 03).
- **`categories`** — `id`, `name`, `slug` (unique).
- **`track_categories`** — many-to-many composite PK on
  `(track_id, category_id)`.
- **`quiz_instances`** — `id`, `category_slug`, `difficulty` (`easy` / `hard` /
  `mixed`), `code`, `created_at`. Unique index on
  `(category_slug, difficulty, code)`.
- **`quiz_instance_tracks`** — `(quiz_instance_id, position)` composite PK,
  `track_id` (no FK so deleted tracks remain representable),
  `track_title_snapshot`.

### Application types (`src/lib/types.ts`)

- `DifficultyMode = "easy" | "hard" | "mixed"`.
- `QuizIdentity = { categorySlug, difficulty, code }` — the path-encoded triple.
- `QuizTrackPayload` — the per-round payload sent to the browser; includes the
  `unavailable: boolean` flag for deleted-track snapshots.
- `QuizInstanceData` (in `src/lib/quizInstances.ts`) — DB row plus ordered
  `tracks: QuizTrackPayload[]`.

## Key files

- **Server-only**
  - [`src/lib/slug.ts`](../src/lib/slug.ts) — `encodeSlug`, `decodeSlug`,
    `generateShortCode`.
  - [`src/lib/prng.ts`](../src/lib/prng.ts) — `mulberry32`,
    `seedStringToUint32`.
  - [`src/lib/selectTracks.ts`](../src/lib/selectTracks.ts) —
    `selectTracksDeterministic`, `toQuizPayload`.
  - [`src/lib/quizInstances.ts`](../src/lib/quizInstances.ts) —
    `getQuizInstance`, `createQuizInstance` (private),
    `getOrCreateQuizInstance`, `toSnapshotQuizPayload`.
  - [`src/lib/categories.ts`](../src/lib/categories.ts) —
    `loadCategoryTrackCounts`, `getAvailableQuizOptions`,
    `isQuizCombinationAvailable`, `getCategoryBySlug`, `getCategoryBySlugOrId`,
    `getTracksForCategory`.
- **Routes**
  - [`src/routes/quiz/[category]/[slug]/index.tsx`](../src/routes/quiz/[category]/[slug]/index.tsx)
    — quiz route handler; validates inputs, runs `getOrCreateQuizInstance`,
    redirects on any failure.
  - [`src/routes/index.tsx`](../src/routes/index.tsx) — home page; renders only
    `(category, difficulty)` pairs reported by `getAvailableQuizOptions`.
- **Tests**
  - [`tests/unit/lib/slug_test.ts`](../tests/unit/lib/slug_test.ts) — round-trip
    and invalid input cases.
  - [`tests/unit/lib/prng_test.ts`](../tests/unit/lib/prng_test.ts) —
    deterministic mulberry32 output for known seeds.
  - [`tests/unit/lib/select_tracks_test.ts`](../tests/unit/lib/select_tracks_test.ts)
    — same `(pool, difficulty, seed)` → same ordered list.
  - [`tests/unit/lib/quiz_instances_test.ts`](../tests/unit/lib/quiz_instances_test.ts)
    — create / re-load / snapshot stability.
  - [`tests/unit/lib/categories_test.ts`](../tests/unit/lib/categories_test.ts)
    — eligibility and lookup helpers.
  - [`tests/integration/routes/category_availability_test.ts`](../tests/integration/routes/category_availability_test.ts),
    [`tests/integration/routes/quiz_routes_test.ts`](../tests/integration/routes/quiz_routes_test.ts)
    — end-to-end coverage of redirects and identity preservation.

## Constraints and invariants

- **Principle I — Deterministic quiz identity** (AGENTS.md). The single most
  important invariant: `(categorySlug, difficulty, code)` → same ordered
  20-track list, forever, regardless of who is logged in or what preferences
  they have set.
- **Principle II — Server-first data boundaries.** The PRNG, the shuffle, the
  snapshot writes, and every DB read happen only in handlers and `src/lib/`. The
  browser only receives the serialized `QuizTrackPayload[]`.
- **Track title snapshots are immutable**. Once `quiz_instance_tracks` is
  written for a quiz, the snapshotted title is the visible title for that round
  even if the live `tracks.title` is later edited. (The visible title for
  available rounds is the live title; the snapshot is the fallback for deleted
  tracks.)
- **No fallback shorter quiz**. The handler MUST redirect rather than serve
  fewer than 20 rounds. The `< 20` check exists in both `createQuizInstance` and
  the route handler.

## Verification approach

- **Unit:** `slug_test.ts`, `prng_test.ts`, `select_tracks_test.ts`,
  `quiz_instances_test.ts`, `categories_test.ts`.
- **Integration:** `category_availability_test.ts`, `quiz_routes_test.ts`,
  `share_resume_test.ts`. Cover: identity preservation across requests,
  redirects on invalid inputs, eligibility gating on the home page, snapshot
  stability after a referenced track is deleted.
- **Manual:** open a fresh quiz URL twice (same triple) and confirm the ordered
  titles match; delete one of the referenced tracks via the admin panel and
  reopen — that round should render with the snapshotted title and an
  "unavailable" marker.

## Open questions and known risks

- **Code space size.** 3 characters from `0–9A-Z` → 36³ = 46 656 distinct
  quizzes per `(category, difficulty)` pair. Collisions inside that space are
  handled by `getOrCreateQuizInstance` (existing row returned); for growing
  libraries the address space could be widened in `CODE_LENGTH` without breaking
  older paths (existing paths still decode and resolve).
- **Snapshot completeness vs. cost.** The snapshot only records title; if a
  track is later edited (different audio file, different difficulty), the live
  row supplies the playable data and the snapshot stays. If audio is replaced
  wholesale, players replaying an old quiz hear the new clip. Document this in
  the admin spec (09) if it becomes a concern.
- **Difficulty migration.** Track-level difficulty is `easy | hard`. If a third
  per-track difficulty (e.g. `medium`) is added later, the snapshot schema, the
  `DifficultyMode` type, and the slug `DIFF_PREFIX` map must all be updated
  together.
