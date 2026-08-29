# 09 — Admin content management

> The admin panel: CRUD over tracks and categories, audio upload with
> collision-safe filename slugging, the music-folder seeding helper, and the
> playback-gain integration hooks.

## Purpose

This subsystem owns:

- The `/admin/*` route tree and its server-rendered CRUD forms.
- The track and category Drizzle reads used by the admin shell
  (`listAdminTracks`, `listAdminCategories`, `listUnlinkedAudioFiles`).
- The unlinked-audio list on `/admin/tracks` and the `?audio=` preselect it
  hands to the new-track form.
- Audio upload handling (`saveTrackAudioUpload`, `resolveTrackFormAudioUrl`,
  `normalizeUploadDir`) — present in `src/lib/` but **not wired to any route**
  today; see "Audio intake" below.
- The music-folder seeder (`seedTracksFromMusicDir`) used to bootstrap a
  category from a directory of audio files.
- Admin-only previews of `AudioPlayer` (`compact` mode) with live windowing
  values from the edit form.

The session and admin gate live in spec 08. Audio bytes, gain math, and the
listen route live in spec 03. Quiz selection lives in spec 02.

## Behavior

### Admin dashboard

[`src/routes/admin/index.tsx`](../src/routes/admin/index.tsx) is the landing
page. It requires `requireAdminSessionOrRedirect` (spec 08) and links to the
track list, the category list, the new-track form, the new-category form, and
the music-folder seed action. Counts come from `listAdminCategories` and
`listAdminTracks` (or admin-only aggregates where added).

### Track CRUD

Routes:

- [`src/routes/admin/tracks/index.tsx`](../src/routes/admin/tracks/index.tsx) —
  the unlinked-audio list (below) followed by **All tracks**: category chips and
  a compact in-row `AudioPlayer` preview.
- [`src/routes/admin/tracks/new.tsx`](../src/routes/admin/tracks/new.tsx) —
  create a track.
- [`src/routes/admin/tracks/[id].tsx`](../src/routes/admin/tracks/[id].tsx) —
  edit / delete a track.

All routes start with `requireAdminSessionOrRedirect`; missing admin returns a
redirect response.

Track form fields ([`src/islands/TrackForm.tsx`](../src/islands/TrackForm.tsx)):

- `title` (required, non-empty).
- `audioUrl` — a `<select>` over the audio files `listAudioFilesInMusicDir`
  finds in `data/music`. There is no in-form upload; see "Audio intake" below.
- `difficulty` (`easy` / `hard`).
- `playStartSeconds`, `maxPlaySeconds` (empty → store `null` → use defaults; see
  spec 03).
- Category checkboxes (multi-select).

On submit:

1. Re-list the music directory and require `audioUrl` to be a member of it. A
   missing title, an unknown audio path, or an unknown difficulty redirects back
   to the form.
2. Parse playback fields with `parseTrackPlaybackFormFields` (spec 03).
3. Insert / update the `tracks` row.
4. Rewrite `track_categories` for the selected categories
   (`trackFormHelpers.ts`).
5. Analyze playback gain, then redirect to the track list.

### Audio intake

Audio files arrive by being copied into `data/music` on the server. The admin UI
never writes audio: it only links an existing file to a `tracks` row.
`saveTrackAudioUpload` / `resolveTrackFormAudioUrl` still exist in
[`src/lib/saveTrackAudioUpload.ts`](../src/lib/saveTrackAudioUpload.ts) with the
upload rules documented under "Audio upload" below, but no route calls them.
Treat that section as the contract to honor **if** an upload field is
reintroduced, not as current behavior.

### Unlinked audio files

Because the `audioUrl` `<select>` lists every file in `data/music` — including
every file already linked to a track — it grows without bound and a
freshly-copied file is hard to find in it. `/admin/tracks` therefore leads with
the files that have **no track yet**:

- `listUnlinkedAudioFiles(db)`
  ([`src/lib/adminReads.ts`](../src/lib/adminReads.ts)) lists `data/music`,
  subtracts every distinct `tracks.audio_url`, then reads the modification time
  of what remains and sorts **newest first**, so a just-copied file leads the
  list. Filtering before stat'ing keeps the filesystem work proportional to the
  unlinked set, not the whole library.
- Comparison normalizes the stored path (trim, `\` → `/`, leading `/` dropped)
  but stays **case-sensitive**, matching the exact set-membership check the form
  handlers gate writes on. A stored value that is not a music-directory path at
  all (a remote URL, say) matches nothing, so the file stays listed — the safe
  direction.
- Each row (`AdminUnlinkedAudioListItem`) shows the filename with its extension
  and links to `/admin/tracks/new?audio=<encoded repo-relative path>`.
- The section is omitted entirely when every file is linked.

`GET /admin/tracks/new` accepts that `audio` parameter, normalizes it, and
preselects it **only if it is in the freshly-listed music directory**; anything
else degrades to an empty form with nothing reflected back. The title is
prefilled from the filename with `trackTitleFromAudioUrl`, the same helper the
music-folder seeder uses, so a track created either way starts from the same
title.

**Invariant.** The `audio` parameter never widens what `POST` accepts — the
create handler re-lists the directory and re-checks membership regardless of how
the form was reached.

Delete is a separate confirmed POST (`/admin/tracks/[id]` with a
`_method=delete`-style form) that removes the `tracks` row and lets the cascade
remove `track_categories`, `collected_tracks`, and any references in
`quiz_instance_tracks` go to snapshot-only (no FK).

### Category CRUD

Routes:

- [`src/routes/admin/categories/index.tsx`](../src/routes/admin/categories/index.tsx)
  — list with track counts.
- [`src/routes/admin/categories/new.tsx`](../src/routes/admin/categories/new.tsx)
  — create.
- [`src/routes/admin/categories/[id].tsx`](../src/routes/admin/categories/[id].tsx)
  — edit / delete.

Category form fields:

- `name` (required).
- `slug` (required, unique). Auto-generated from the name by
  [`src/lib/formatSlug.ts`](../src/lib/formatSlug.ts) when left blank.

Delete is blocked when the category still has track assignments. The form
returns an error response listing the offending tracks.

### Audio upload

[`src/lib/saveTrackAudioUpload.ts`](../src/lib/saveTrackAudioUpload.ts):

- **Upload limit:** `MAX_BYTES = 50 * 1024 * 1024` (50 MiB).
- **Allowed extensions:** the `AUDIO_EXT` set from
  [`src/lib/audioExtensions.ts`](../src/lib/audioExtensions.ts) —
  `.mp3 .m4a .ogg .wav .flac .aac`. The extension is derived from the filename
  if present; otherwise from the upload's `type` MIME via the `MIME_TO_EXT` map.
- **Upload directory:** `normalizeUploadDir` defaults to `data/music`, rejects
  `..` segments, and converts backslashes to forward slashes.
- **Filename slug:** built from `slugifyTrackTitleForFilename(title)`
  ([`src/lib/trackTitleSlug.ts`](../src/lib/trackTitleSlug.ts)).
- **Collision handling:** `firstNonExistingFilePath` tries up to 1000 variants
  by suffixing `-2`, `-3`, … until an unused filename is found.
- **Atomicity:** on any failure during stream piping, the partially written file
  is removed.
- The returned value is the repo-relative POSIX path stored as
  `tracks.audio_url` — the same path the listen route resolves.

### Music-folder seeder

[`src/lib/seedMusic.ts`](../src/lib/seedMusic.ts):

`seedTracksFromMusicDir(db, { musicDir?, difficulty?, categorySlug?,
categoryName? })`:

- Defaults `musicDir` to `data/music`, `difficulty` to `easy`.
- Throws `Deno.errors.NotFound` if the directory does not exist (with a message
  that tells the operator to create it).
- Reads every audio file in the directory (filtered by `AUDIO_EXT`), sorts by
  locale-aware name.
- For each file, inserts a `tracks` row using `titleFromFilename` to derive a
  display title, unless a row with the same `audio_url` already exists (skipped
  — idempotent).
- When `categorySlug` is provided, the category is created with
  `displayNameFromSlug(slug)` (or `categoryName` override) if missing, and each
  new track is linked.

Returns `{ inserted, skipped }` for the admin UI to display.

### Compact AudioPlayer previews

`AdminTrackListItem` rows embed `AudioPlayer` (spec 06) with the `compact` flag.
The preview disables the visualizer (`AudioVisualizer` runs with
`enabled: false`) so the admin list does not pay per-row `requestAnimationFrame`
overhead. The edit page passes `syncFormId` so the player reads the live form
fields and re-runs `parseTrackPlaybackFormFields` on each render — admins can
drag the start offset around and immediately preview the clip.

### Edge cases

- **Title-only filename collisions across categories.** Two tracks with the same
  title in different categories produce different slugged filenames only if
  their `slugifyTrackTitleForFilename` outputs collide. The `-2`, `-3` suffix
  loop handles it; up to 1000 attempts means the operator must intervene if a
  category really has > 1000 identical titles.
- **Upload directory traversal.** `..` segments are rejected; an empty
  `uploadDir` falls back to the default.
- **Wrong MIME type, wrong extension.** The upload is rejected (return `null`)
  and the form surfaces an error.
- **Edit without changing audio.** Leaving both `audioFile` and `audioUrl` blank
  keeps the existing `audio_url` (handled in the route handler before calling
  `resolveTrackFormAudioUrl`).
- **Deleting a track that is referenced by an existing quiz instance.** Allowed
  — the snapshot survives because `quiz_instance_tracks.track_id` has no FK. The
  round becomes `unavailable` in resumed quizzes (spec 02).

## Data model

Tables touched by this subsystem:

- `tracks` (full CRUD).
- `categories` (full CRUD).
- `track_categories` (rewritten on each track save; rows on category insert /
  delete).
- `collected_tracks`, `quiz_instance_tracks` are cascade- or snapshot- affected
  only.

No new tables are introduced by this subsystem.

## Key files

- **Server-only**
  - [`src/lib/adminReads.ts`](../src/lib/adminReads.ts) — shared admin queries.
  - [`src/lib/saveTrackAudioUpload.ts`](../src/lib/saveTrackAudioUpload.ts) —
    upload pipeline.
  - [`src/lib/seedMusic.ts`](../src/lib/seedMusic.ts) —
    `seedTracksFromMusicDir`.
  - [`src/lib/listMusicDir.ts`](../src/lib/listMusicDir.ts) — lists audio files
    in the music directory (`listAudioFilesInMusicDir`) plus the pure
    `filterUnlinkedAudioUrls` / `sortAudioEntriesByNewestFirst` helpers and
    `readAudioEntryModifiedTimes`.
  - [`src/lib/audioFilePath.ts`](../src/lib/audioFilePath.ts) —
    `basenameFromAudioUrl`, `filenameFromAudioUrl`, and `trackTitleFromAudioUrl`
    (shared with `seedMusic.ts`).
  - [`src/lib/trackFormHelpers.ts`](../src/lib/trackFormHelpers.ts) — track-form
    parsing and category sync.
  - [`src/lib/formatSlug.ts`](../src/lib/formatSlug.ts) — category slug
    generator.
  - [`src/lib/trackTitleSlug.ts`](../src/lib/trackTitleSlug.ts) — audio filename
    slug.
  - [`src/lib/audioExtensions.ts`](../src/lib/audioExtensions.ts) — `AUDIO_EXT`.
- **Routes**
  - [`src/routes/admin/index.tsx`](../src/routes/admin/index.tsx) — dashboard.
  - [`src/routes/admin/tracks/{index,new,[id]}.tsx`](../src/routes/admin/tracks/)
    — track CRUD.
  - [`src/routes/admin/categories/{index,new,[id]}.tsx`](../src/routes/admin/categories/)
    — category CRUD.
  - [`src/routes/api/categories/index.ts`](../src/routes/api/categories/index.ts),
    [`src/routes/api/categories/[key]/tracks.ts`](../src/routes/api/categories/[key]/tracks.ts)
    — admin-side helper endpoints (category list, tracks-in-category). The
    tracks endpoint returns each track's `filename` (bare audio filename, no
    directory and no extension) for verification; the full file path is never
    exposed.
- **Islands (client)**
  - [`src/islands/TrackForm.tsx`](../src/islands/TrackForm.tsx),
    [`src/islands/TrackAudioPick.tsx`](../src/islands/TrackAudioPick.tsx) —
    interactive track form pieces.
  - [`src/islands/TrackTitleInput.tsx`](../src/islands/TrackTitleInput.tsx) —
    title input with live slug preview.
- **Components (SSR)**
  - [`src/components/admin/AdminPageShell.tsx`](../src/components/admin/AdminPageShell.tsx),
    [`src/components/admin/AdminListHeader.tsx`](../src/components/admin/AdminListHeader.tsx),
    [`src/components/admin/AdminBackLink.tsx`](../src/components/admin/AdminBackLink.tsx),
    [`src/components/admin/AdminTrackListItem.tsx`](../src/components/admin/AdminTrackListItem.tsx),
    [`src/components/admin/AdminUnlinkedAudioListItem.tsx`](../src/components/admin/AdminUnlinkedAudioListItem.tsx),
    [`src/components/admin/AdminCategoryListItem.tsx`](../src/components/admin/AdminCategoryListItem.tsx),
    [`src/components/admin/CategoryForm.tsx`](../src/components/admin/CategoryForm.tsx),
    [`src/components/admin/CategoryBadge.tsx`](../src/components/admin/CategoryBadge.tsx),
    [`src/components/admin/DangerZoneDeleteForm.tsx`](../src/components/admin/DangerZoneDeleteForm.tsx),
    [`src/components/admin/{ManageCategoriesButton,ManageTracksButton,NewCategoryButton,NewTrackButton}.tsx`](../src/components/admin/).
- **Tests**
  - [`tests/integration/routes/admin_crud_test.ts`](../tests/integration/routes/admin_crud_test.ts)
    — create / edit / delete behavior, category delete guard, confirmation gate.
  - [`tests/integration/routes/composition_boundary_test.ts`](../tests/integration/routes/composition_boundary_test.ts)
    — enforces components-never-import-islands across the admin tree.
  - [`tests/unit/lib/listMusicDir_test.ts`](../tests/unit/lib/listMusicDir_test.ts)
    — unlinked filtering and newest-first ordering.
  - [`tests/unit/lib/audio_file_path_test.ts`](../tests/unit/lib/audio_file_path_test.ts)
    — filename and title derivation.
  - [`tests/unit/components/admin_unlinked_audio_list_item_test.tsx`](../tests/unit/components/admin_unlinked_audio_list_item_test.tsx)
    — the preselect link, its encoding, and the row's accessible label.

## Constraints and invariants

- **Principle IV — Passkey-secured authentication.** Every admin route starts
  with `requireAdminSessionOrRedirect`. Adding a new admin route MUST include
  the same gate at the top of the handler.
- **Destructive operations require confirmation.** Track and category deletes go
  through `DangerZoneDeleteForm`; the form posts only after an explicit
  confirmation step.
- **Audio uploads stay inside the configured upload directory.** Path traversal
  is rejected at three layers: `normalizeUploadDir`, the resolved absolute path
  inside the project root, and the listen route (spec 03).
- **Category deletion is blocked while tracks are assigned.** The delete handler
  MUST re-check `track_categories` before removing the row to avoid leaving
  orphaned joins.
- **Edit form previews never bypass the server.** The compact `AudioPlayer`
  preview fetches audio from `/api/listen/:id` like any other listen call; it
  does not read the local upload before the form is submitted.

## Verification approach

- **Integration:** `admin_crud_test.ts` covers create / edit / delete behavior,
  category delete guard, confirmation gate, and re-render of the list after a
  successful mutation.
- **Unit:** `tests/unit/lib/listMusicDir_test.ts` covers
  `filterUnlinkedAudioUrls` (exact match, backslash / leading-slash / whitespace
  variants, a stored remote URL, case sensitivity) and
  `sortAudioEntriesByNewestFirst` (descending mtime, unknown times last, name
  tie-break, no input mutation). `tests/unit/lib/audio_file_path_test.ts` covers
  `basenameFromAudioUrl` and `trackTitleFromAudioUrl`.
  `tests/unit/components/admin_unlinked_audio_list_item_test.tsx` renders the
  row and asserts the `?audio=` link, its percent-encoding, and the
  `sr-only sm:not-sr-only` label. The DB-backed `listUnlinkedAudioFiles` is not
  unit-tested (tests avoid the `db` singleton, which opens `data/quiz.db` at
  import); it is covered by the manual pass below.
- **Manual:**
  - Copy a few audio files into `data/music`, open `/admin/tracks`, and confirm
    they appear under **Unlinked audio files** newest first with a matching
    count. Click **Add track** on one: the new-track form opens with that file
    selected and the title prefilled. Save, and confirm the file moves out of
    the unlinked section into **All tracks**. With every file linked, the
    section is absent.
  - Request `/admin/tracks/new?audio=../../etc/passwd` and `?audio=` with a path
    outside `data/music`: the form must render with nothing preselected and no
    reflected value.
  - Sign in as admin, create a category, upload an audio file with the same
    filename twice — confirm the second upload lands as `-2`.
  - Edit a track, change `playStartSeconds` and `maxPlaySeconds`, use the
    in-form `AudioPlayer` preview to confirm the new window plays correctly.
  - Try to delete a category with assigned tracks — confirm the form surfaces an
    error and the row is preserved.
  - Run `seedTracksFromMusicDir` against an empty / nonexistent directory —
    confirm the `Deno.errors.NotFound` message reaches the UI.

## Open questions and known risks

- **Bulk upload.** There is no batch upload UI. Operators script around it with
  `seedTracksFromMusicDir` today. The unlinked-audio list makes a batch workable
  one file at a time — creating a track redirects back to `/admin/tracks`, where
  the remaining files are still at the top — but a real bulk-upload page with
  progress would still help.
- **Missing files are not surfaced.** The unlinked list answers "which files
  have no track"; the inverse (a `tracks` row whose file has been deleted) is
  only surfaced per-track by the edit form's warning. See the audio-file orphan
  item in `specs/90-roadmap.md`.
- **Edit conflicts.** No optimistic concurrency control. Two admins editing the
  same track produce a last-writer-wins result. Acceptable for the current
  single-admin reality; consider an `updated_at` column
  - If-Match style guard if the admin set grows.
- **Audio file orphans.** Deleting a track row does NOT delete the uploaded
  file. This is by design (other rows may reference the same path), but a
  periodic janitor should be considered if disk usage grows.
- **Slugify drift.** `slugifyTrackTitleForFilename` and `formatSlug` are
  independent normalizations. If a future feature relies on "filename matches
  category slug", reconcile both helpers in one place.
