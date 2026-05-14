# 09 — Admin content management

> The admin panel: CRUD over tracks and categories, audio upload with
> collision-safe filename slugging, the music-folder seeding helper, and the
> playback-gain integration hooks.

## Purpose

This subsystem owns:

- The `/admin/*` route tree and its server-rendered CRUD forms.
- The track and category Drizzle reads used by the admin shell
  (`listAdminTracks`, `listAdminCategories`).
- Audio upload handling (`saveTrackAudioUpload`, `resolveTrackFormAudioUrl`,
  `normalizeUploadDir`).
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
  list with category chips and a compact in-row `AudioPlayer` preview.
- [`src/routes/admin/tracks/new.tsx`](../src/routes/admin/tracks/new.tsx) —
  create a track.
- [`src/routes/admin/tracks/[id].tsx`](../src/routes/admin/tracks/[id].tsx) —
  edit / delete a track.

All routes start with `requireAdminSessionOrRedirect`; missing admin returns a
redirect response.

Track form fields:

- `title` (required, non-empty).
- `audioFile` (upload) **or** `audioUrl` (repo-relative POSIX path). Uploads win
  when present.
- `uploadDir` (defaults to `data/music`).
- `difficulty` (`easy` / `hard`).
- `playStartSeconds`, `maxPlaySeconds` (empty → store `null` → use defaults; see
  spec 03).
- Category checkboxes (multi-select).

On submit:

1. Resolve the audio URL via `resolveTrackFormAudioUrl(form)`:
   - If `audioFile` is a non-empty `Blob`, call `saveTrackAudioUpload`.
   - Otherwise return the trimmed `audioUrl` field.
   - Otherwise return `null`. The form re-renders with an error.
2. Parse playback fields with `parseTrackPlaybackFormFields` (spec 03).
3. Insert / update the `tracks` row.
4. Rewrite `track_categories` for the selected categories
   (`trackFormHelpers.ts`).
5. Redirect to the track list.

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
  - [`src/lib/listMusicDir.ts`](../src/lib/listMusicDir.ts) — admin helper for
    listing audio files in the upload directory.
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
    — admin-side helper endpoints (category list, tracks-in-category).
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
- **Manual:**
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
  `seedTracksFromMusicDir` today. If admins frequently upload dozens of files, a
  real bulk-upload page with progress would help.
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
