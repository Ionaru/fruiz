# 03 — Audio playback and gain

> Server-side audio file serving, per-track loudness normalization, and clip
> windowing (start offset, max length, fades) so every clip plays at a
> consistent perceived volume and length.

## Purpose

This subsystem owns:

- Resolving a track's stored `audio_url` to a real file path on disk.
- Streaming audio bytes over HTTP (full responses and `Range` requests).
- Per-track loudness measurement (`ffmpeg loudnorm`) and clamped gain storage —
  two gains per track: a **full-track** gain (collection listening) and a
  **clip-window** gain (quiz + admin preview) — including a fingerprint cache so
  unchanged files and unchanged clip windows are not re-measured.
- Clip windowing constants and clamping helpers (start, max length, fade-in /
  fade-out, minimum playable window).
- The cache-busting `?v=…` query parameter on listen URLs.

The visualizer, the on-screen player, and the player UI live in spec 06. Track
CRUD and the admin audio upload flow live in spec 09.

## Behavior

### Listen endpoint (`/api/listen/:id`)

The route handler is
[`src/routes/api/listen/[id].ts`](../src/routes/api/listen/[id].ts).

1. Look up the track by `id`. Missing track → `404 Not Found`.
2. Resolve `tracks.audio_url` to an absolute path with
   `absolutePathFromTracksAudioUrl`. Rejects remote URLs (`http(s)://…`) and any
   path containing `..` segments — both return `404`.
3. `Deno.open` the resolved file. Missing file → `404`.
4. Set `Content-Type` from the file extension
   (`.mp3 .m4a .ogg .wav .flac
   .aac` only). Anything else falls back to
   `audio/mpeg`.
5. Always send `Accept-Ranges: bytes`.
6. If no `Range` header: respond `200` with `Content-Length: <file size>` and
   the file's `readable` stream.
7. If a `Range` header is present: parse it as a single byte range (suffix range
   supported via `bytes=-N`), clamp to file bounds, seek to start, stream the
   requested bytes through `rangeReadableStreamFromPosition` (64 KiB chunks),
   and respond `206` with `Content-Length` and `Content-Range`.

### Listen URL cache-busting

[`src/lib/audioListenUrl.ts`](../src/lib/audioListenUrl.ts) exposes
`buildListenSrc({ id, playbackGainSourceSize, playbackGainSourceMtimeMs })`:

- If either fingerprint column is `null`, returns `/api/listen/{id}` (no query).
- Otherwise returns `/api/listen/{id}?v={size}-{mtimeMs}`.

The intent is to invalidate the player's HTTP cache as soon as a new audio file
is uploaded — the URL changes whenever the size or mtime changes, and unchanged
files keep stable URLs.

### Clip windowing

[`src/lib/quizPlayback.ts`](../src/lib/quizPlayback.ts) defines the constants
and resolvers:

| Constant                      | Value (seconds) | Use                                                |
| ----------------------------- | --------------- | -------------------------------------------------- |
| `DEFAULT_MAX_PLAY_SECONDS`    | 30              | Fallback `max_play_seconds` when the DB is `null`. |
| `FADE_IN_SECONDS`             | 1               | Audible fade at clip start.                        |
| `FADE_OUT_SECONDS`            | 1               | Audible fade before stop.                          |
| `MIN_PLAYABLE_WINDOW_SECONDS` | 2.5             | Minimum window so fades fit.                       |

`resolvePlayStartSeconds(value)` returns `0` for `null` / non-finite / negative
inputs and clamps to 24 hours. `resolveMaxPlaySeconds(value)` defaults to
`DEFAULT_MAX_PLAY_SECONDS` for `null` / non-finite values and clamps between
`MIN_PLAYABLE_WINDOW_SECONDS` and 24 hours.

`clampStartAndMaxToDuration(start, max, duration)` is called from the client
once `HTMLMediaElement.duration` is known, so a too-long window cannot run past
the end of the file.

`parseTrackPlaybackFormFields(form)` is the admin-form parser: empty strings
mean "store `null`" (use defaults); otherwise the value must parse as a finite
number, with `playStartSeconds >= 0` and
`maxPlaySeconds >=
MIN_PLAYABLE_WINDOW_SECONDS`.

### Playback gain

[`src/lib/playbackGainMath.ts`](../src/lib/playbackGainMath.ts) defines:

- `PLAYBACK_TARGET_LUFS = -16` — integrated loudness target used by
  `ffmpeg loudnorm`.
- `PLAYBACK_GAIN_CLAMP_DB = 12` — gain is symmetrically clamped to ±12 dB.
- `playbackGainDbToLinear(db) = 10^(db / 20)` — applied client-side on the
  `<audio>` GainNode.

[`src/lib/playbackGainAnalysis.ts`](../src/lib/playbackGainAnalysis.ts)
implements measurement:

- `fingerprintFromFileInfo(Deno.FileInfo)` returns `{ size, mtimeMs }` or `null`
  when `mtime` is missing.
- `storedFingerprintMatchesFile(...)` is the cache-hit check.
- `hasCompleteStoredFingerprint(...)` distinguishes legacy gain-only rows from
  fingerprinted rows.
- `measurePlaybackGainDb(absolutePath, window?)` shells out to a system `ffmpeg`
  binary (ffmpeg.wasm is not a fit for server-side Deno — see
  ffmpegwasm/ffmpeg.wasm#110) and parses `input_i` from `loudnorm` JSON output,
  then computes `PLAYBACK_TARGET_LUFS - input_i` and runs it through
  `clampPlaybackGainDb`. With a `PlaybackGainWindow`, `buildLoudnormArgs` adds
  input seeking (`-ss`/`-t`) so only the quiz clip window is analyzed.
  `measureClipGainDb(path, start, max)` is the clip-window wrapper.
- `decideGainRecompute({ force, fullGainDb, clipGainDb, fingerprintStale,
  boundsChanged })`
  is the pure invalidation rule: the full gain is recomputed on `force` /
  never-measured / file change; the clip gain additionally recomputes when the
  resolved clip window shifts.
- The orchestrating `analyzeAndStorePlaybackGainForTrack` reads both gains,
  their fingerprint, and the resolved clip bounds, recomputes full and clip
  **independently** (up to two `ffmpeg` passes, each guarded), and records one
  of these outcomes: `invalid_audio_url`, `file_not_found`, `cache_hit`,
  `seeded_fingerprint`, `measured` (either gain ran), `ffmpeg_failed`. A `force`
  option bypasses the cache.
- The admin track-edit preview can recompute the clip gain for an unsaved window
  via the admin-only endpoint
  [`src/routes/api/admin/tracks/[id]/clip-gain.ts`](../src/routes/api/admin/tracks/[id]/clip-gain.ts),
  which measures the given `start`/`max` window and returns
  `{ clipPlaybackGainDb }` **without writing to the DB** (persistence happens on
  save).

A background task at `deno task playback-gain:backfill` walks every track and
runs the analyzer. The tool entrypoint is `tools/playback_gain_backfill.ts`.

## Data model

Fields on `tracks` (Drizzle, `src/db/schema.ts`):

| Column                             | Type | Notes                                                                     |
| ---------------------------------- | ---- | ------------------------------------------------------------------------- |
| `audio_url`                        | text | Repo-relative POSIX path; resolved via `absolutePathFromTracksAudioUrl`.  |
| `playback_gain_db`                 | real | Full-track dB toward `-16 LUFS`, clamped to ±12; `null` when unmeasured.  |
| `playback_gain_source_size`        | int  | File size at measurement time. `null` for legacy rows.                    |
| `playback_gain_source_mtime_ms`    | int  | File mtime in ms since epoch at measurement time. `null` if unknown.      |
| `play_start_seconds`               | real | Start offset; `null` → default `0`.                                       |
| `max_play_seconds`                 | real | Max clip length including fades; `null` → `DEFAULT_MAX_PLAY_SECONDS`.     |
| `clip_playback_gain_db`            | real | Clip-window dB toward `-16 LUFS`, clamped to ±12; `null` when unmeasured. |
| `clip_playback_gain_start_seconds` | real | Resolved clip start the clip gain was measured at (invalidation).         |
| `clip_playback_gain_max_seconds`   | real | Resolved clip max length the clip gain was measured at (invalidation).    |

`QuizTrackPayload` (see `src/lib/types.ts`) carries the resolved (`null`-free)
`playStartSeconds` and `maxPlaySeconds`, the source fingerprint fields, and both
`playbackGainDb` (full track) and `clipPlaybackGainDb` (clip) to the browser.
The quiz applies `clipPlaybackGainDb` (falling back to `playbackGainDb`); the
collection applies the full `playbackGainDb`.

## Key files

- **Server-only**
  - [`src/lib/audioFilePath.ts`](../src/lib/audioFilePath.ts) —
    `absolutePathFromTracksAudioUrl`.
  - [`src/lib/audioExtensions.ts`](../src/lib/audioExtensions.ts) — `AUDIO_EXT`
    set, `contentTypeForAudioPath`.
  - [`src/lib/audioListenUrl.ts`](../src/lib/audioListenUrl.ts) —
    `buildListenSrc`.
  - [`tests/audioListenUrl_test.ts`](../tests/audioListenUrl_test.ts) — tests
    for the cache-bust URL builder.
  - [`src/lib/quizPlayback.ts`](../src/lib/quizPlayback.ts) — clip windowing
    constants, `resolvePlayStartSeconds`, `resolveMaxPlaySeconds`,
    `clampStartAndMaxToDuration`, `parseTrackPlaybackFormFields`.
  - [`src/lib/playbackGainMath.ts`](../src/lib/playbackGainMath.ts) — target,
    clamp, `playbackGainDbToLinear`.
  - [`src/lib/playbackGainAnalysis.ts`](../src/lib/playbackGainAnalysis.ts) —
    fingerprinting, `measurePlaybackGainDb`, orchestration.
- **Routes**
  - [`src/routes/api/listen/[id].ts`](../src/routes/api/listen/[id].ts).
  - [`src/routes/api/admin/tracks/[id]/clip-gain.ts`](../src/routes/api/admin/tracks/[id]/clip-gain.ts)
    — admin-only clip-gain recalc for the track-edit preview (no DB write).
- **Tools / tasks**
  - `tools/playback_gain_backfill.ts` (entry for
    `deno task playback-gain:backfill`).
- **Tests**
  - [`tests/playbackGainAnalysis_test.ts`](../tests/playbackGainAnalysis_test.ts)
    — fingerprint helpers and parser cases.
  - [`tests/unit/lib/quiz_playback_test.ts`](../tests/unit/lib/quiz_playback_test.ts)
    — clip windowing resolvers, clamping, admin parser.

## Constraints and invariants

- **Principle II — Server-first data boundaries.** Audio files are never bundled
  into the client. Every clip is fetched from `/api/listen/:id` on demand. The
  listen route is the only path that exposes audio bytes.
- **No remote audio URLs.** `tracks.audio_url` MUST be a repo-relative path.
  Remote URLs are rejected at resolve time (`404`).
- **Path traversal is blocked.** Any `..` segment results in `404`.
- **Gain is always clamped.** A measured `loudnorm` result outside ±12 dB MUST
  NOT be persisted unclamped — `clampPlaybackGainDb` is applied before write.
- **Defaults must keep clips playable.** `resolveMaxPlaySeconds` lower bound is
  `MIN_PLAYABLE_WINDOW_SECONDS` so fade-in plus fade-out plus a brief audible
  window always fit.
- **Cache validity comes from fingerprint, not gain alone.** A row with
  `playback_gain_db` set but `null` fingerprint columns is treated as a _seeded_
  row and is eligible for re-measurement; only a row with both fingerprint
  columns matching the live file is a cache hit.
- **Clip gain tracks the clip window.** The clip gain is invalidated by the file
  fingerprint AND by a change to the resolved clip window — `boundsChanged`
  compares `clip_playback_gain_start_seconds` / `clip_playback_gain_max_seconds`
  against the resolved `play_start_seconds` / `max_play_seconds`, so editing the
  window forces a clip-only recompute on the next analyze (which the admin save
  triggers).

## Verification approach

- **Unit:** `playbackGainAnalysis_test.ts` (fingerprint helpers, loudnorm output
  parsing), `quiz_playback_test.ts` (windowing resolvers and parser),
  `audioListenUrl_test.ts` (cache-bust URL shape).
- **Integration:** the listen route is exercised indirectly through the
  quiz-route integration tests; add a focused test under `tests/integration/` if
  range handling regresses.
- **Manual:**
  - Open a quiz, confirm clips play and the volume sounds consistent across
    tracks.
  - Replace a track's audio file in-place — check that the next listen URL has a
    different `?v=` and that the player picks up the new file on reload.
  - Run `deno task playback-gain:backfill` against a small dataset; verify rows
    update `playback_gain_db`, `clip_playback_gain_db`, and both fingerprint
    columns. Re-run without `--force` → all `cache_hit`.
  - On the admin track-edit page, change the start / max-length fields: the
    "outdated" badge appears, "Recalculate loudness" updates the preview, and
    Save persists a clip gain matching the saved window (badge gone on reload).

## Open questions and known risks

- **`ffmpeg` is a runtime dependency.** The backfill task is a no-op when
  `ffmpeg` is not on `PATH`; this is acceptable for development but the
  production image MUST install `ffmpeg` if normalized playback is required.
  Document this in the deployment docs when they exist.
- **Single-range only.** The current `/api/listen` parser handles the first byte
  range only; multi-range requests would be dropped on the floor (treated as
  no-range, full body). This is fine for `<audio>` elements in practice; revisit
  if a downloader-style client needs it.
- **No signed listen URLs.** Today the listen route is unauthenticated and
  predictable; anyone who has a track id can fetch the audio. If audio rights
  become sensitive, sign listen URLs with a short-lived HMAC over `(id, expiry)`
  and validate at the route. Flag this in spec 90 (roadmap) before any public
  launch.
