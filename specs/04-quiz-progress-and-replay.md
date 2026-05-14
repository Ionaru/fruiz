# 04 — Quiz progress and replay

> Device-local progress for an in-flight quiz, the rules for skipping and
> advancing focus, and the replay-limit gate that controls how often a clip can
> be played before the player commits to an answer.

## Purpose

This subsystem owns:

- The `QuizProgress` shape stored in `localStorage`, keyed by quiz path.
- Loading, saving, validating, and merging that stored progress.
- The "skip advances to the next clip" focus rules (`findNextTrackAfterSkip`).
- The "resume the right track" rules on reload (`findResumeActiveTrackId`).
- The settings gate that runs when the `limit` query parameter is absent.
- The replay-limit gate that disables the play control once the player has used
  all their replays for the active track.
- The "End quiz" path that converts remaining skipped tracks into `incorrect`.

Quiz selection (which tracks load) lives in spec 02. Answer matching and
submission gating live in spec 05. The on-screen audio player lives in spec 06.

## Behavior

### Settings gate (bare URL flow)

The quiz route handler reads `?limit=<n>` through `parseReplayLimitFromUrl` (see
spec 02). If the parameter is missing, it returns `null`; if present but
malformed, it returns `0`.

`QuizController` opens the settings gate when
`props.initialReplayLimit ===
null`. The gate captures a non-negative integer
(`0` = unlimited) into `draftLimit`. On confirm, it commits the value to
`replayLimit`, writes `?limit=<value>` into the URL via `history.replaceState`,
and starts the quiz.

This is how shared bare URLs (`/quiz/disney/m8AB`) preserve quiz identity: the
recipient sets their own replay limit before play begins, without changing which
tracks load.

### Replay limit gate

For each track row, `replayBlocked(trackId)`:

- Returns `false` if `replayLimit <= 0` (unlimited).
- Returns `true` if the row is missing or `status === "unavailable"`.
- Otherwise returns `true` once `replayCount >= replayLimit`.

`onPlayStart(trackId)` increments `replayCount` every time playback begins. The
audio player disables the play control when the gate trips, so the player must
submit or skip to proceed.

### Skip and advance focus

`onSkip` defends against accidental skips:

- If there is no active track id, do nothing.
- If the active row is `correct` or `incorrect`, do nothing.

Otherwise it sets the row to `status: "skipped"` and `selectedTitle: null`, then
calls `findNextTrackAfterSkip(tracks, progressAfterSkip,
currentTrackId)`:

1. Scan indices `(currentIndex + 1) % n`, `(currentIndex + 2) % n`, …, wrapping
   past the end.
2. If _any_ track in the quiz has `status === "unanswered"`, the active track
   becomes the first `unanswered` row hit by the scan.
3. Otherwise (all incomplete remaining are `skipped`), the active track becomes
   the first `skipped` row hit by the scan.
4. If the scan finds nothing, the active id stays the same (defensive — should
   only happen when the active is the sole remaining incomplete).

`advanceToTrack` sets `activeId` and seeds `answerDraft` from the row's
`selectedTitle` (or `""`).

`onNext` (used by the "Next" button after a terminal answer) reuses
`findNextTrackAfterSkip` against the current progress to skip past finalized
rounds.

### Resume on reload

On first `useSignalEffect` run, the island reads
`localStorage[STORAGE_KEY_PREFIX + quizPath]`:

- `tryMergeStoredProgress` validates the parsed JSON: the `quizPath` must match,
  the track count must match, and every `trackId` must be present in the live
  track list. Failures return `null` (the default progress is used).
- Valid stored progress overwrites the in-memory state and the score is
  recomputed via `scoreFromProgress`.
- `findResumeActiveTrackId` picks the first `unanswered` track to resume on; if
  none remain, it falls back to the previously active id or the first track in
  the list.
- If the merged progress is already `isComplete`, the results screen opens
  immediately.

Subsequent renders write the current progress back to `localStorage` on every
state change.

### Ending the quiz

The quiz ends when every row has a terminal status (`correct`, `incorrect`, or
`unavailable`). The results screen opens automatically.

Two extra rules:

- **`canEndQuizWithSkippedRemaining`** is true when no `unanswered` rows remain
  _and_ at least one `skipped` row remains. In that state the UI shows an "End
  quiz" button that flips the remaining `skipped` rows to `incorrect` and opens
  the results screen.
- **Auto-unavailable rounds**: a track with `status === "unavailable"` counts as
  a _correct_ round for score purposes (`scoreFromProgress`). Players cannot
  answer it; the round is treated as a freebie since the underlying track was
  deleted after the quiz was created.

### Edge cases

- **Local storage disabled or quota-exceeded.** `localStorage` calls are wrapped
  in `try / catch` — failure is silent. The quiz still works in memory; progress
  simply does not persist across reloads.
- **Stored progress shape drift.** Any structural mismatch in stored JSON is
  treated as missing — the player starts fresh rather than seeing a broken UI.
- **Sole remaining incomplete is the active track.** `findNextTrackAfterSkip`
  leaves the active id unchanged, so the player can answer the only remaining
  round.
- **Play again.** Generates a fresh 3-char code, preserves the existing
  `?limit=` (and any other query params), and navigates to a new quiz path.
  Progress is not carried over (different path → different storage key).

## Data model

`QuizProgress` and `QuizProgressTrack` are defined in
[`src/lib/types.ts`](../src/lib/types.ts):

```ts
type TrackStatus =
  | "unanswered"
  | "skipped"
  | "correct"
  | "incorrect"
  | "unavailable";

interface QuizProgressTrack {
  trackId: string;
  status: TrackStatus;
  selectedTitle: string | null;
  replayCount: number;
}

interface QuizProgress {
  quizPath: string;
  score: number;
  tracks: QuizProgressTrack[];
}
```

Storage key prefix: `fruiz-quiz:` (from
[`src/lib/quizProgress.ts`](../src/lib/quizProgress.ts)). Full key is
`fruiz-quiz:/quiz/{categorySlug}/{slug}` — i.e. the prefix concatenated with the
literal quiz path, so two players sharing a URL share a key on their own devices
but not across devices.

In-progress quiz discovery on the home page uses `InProgressQuizEntry` (also in
`types.ts`), produced by the `InProgressQuizSection` island scanning
`localStorage` keys with the prefix.

## Key files

- **Server-only**
  - [`src/lib/quizProgress.ts`](../src/lib/quizProgress.ts) —
    `buildDefaultProgress`, `isComplete`, `canEndQuizWithSkippedRemaining`,
    `scoreFromProgress`, `findNextTrackAfterSkip`, `findResumeActiveTrackId`,
    `tryMergeStoredProgress`, `STORAGE_KEY_PREFIX`.
  - [`src/lib/types.ts`](../src/lib/types.ts) — types listed above plus
    `InProgressQuizEntry`.
  - [`src/lib/categories.ts`](../src/lib/categories.ts) —
    `parseReplayLimitFromUrl` (the `null` / `0` semantics for the settings
    gate).
- **Islands (client)**
  - [`src/islands/QuizController.tsx`](../src/islands/QuizController.tsx) —
    settings gate, replay gate, skip/next/end actions, popup result flow,
    persistence effects, keyboard space-bar play/stop.
  - [`src/islands/InProgressQuizSection.tsx`](../src/islands/InProgressQuizSection.tsx)
    — home-page list of resumable quizzes.
- **Components (SSR)**
  - [`src/components/quiz/SettingsGate.tsx`](../src/components/quiz/SettingsGate.tsx)
    — the gate UI (no client behavior of its own).
  - [`src/components/quiz/InProgressQuizItem.tsx`](../src/components/quiz/InProgressQuizItem.tsx)
    — individual resume row.
- **Tests**
  - [`tests/unit/lib/quiz_playback_test.ts`](../tests/unit/lib/quiz_playback_test.ts)
    — progress helpers (skip-advance, resume, default progress).
  - [`tests/integration/routes/share_resume_test.ts`](../tests/integration/routes/share_resume_test.ts)
    — bare URL → settings gate behavior.

## Constraints and invariants

- **Principle I — Deterministic quiz identity.** `replayLimit`, progress, the
  active track id, and the answer draft are all player-local. None of them MUST
  influence quiz selection (verified by spec 02 invariants).
- **Submitted answers are terminal.** A row that is `correct` or `incorrect`
  cannot revert to `unanswered` or `skipped`. Skip and submit both check the
  existing status first.
- **Storage key includes the full quiz path.** Two players opening the same URL
  share a key on their _own_ devices but never across devices — there is no
  server-side sync.
- **`unavailable` rounds are not playable but score as correct.** Players cannot
  lose points to a row whose underlying track was deleted after the quiz was
  created.
- **Replay count is per round.** Switching the active track does not reset
  replay counters; they persist for the lifetime of the quiz.

## Verification approach

- **Unit:** `quiz_playback_test.ts` covers `buildDefaultProgress`,
  `findNextTrackAfterSkip` circular scan, `findResumeActiveTrackId`,
  `tryMergeStoredProgress` validation, and `canEndQuizWithSkippedRemaining`.
- **Integration:** `share_resume_test.ts` covers the bare URL → settings gate
  path and confirms two different `?limit=` values on the same path produce the
  same ordered track list.
- **Manual:**
  - Start a quiz, answer a few rounds, reload — confirm answers persist and
    focus lands on the next `unanswered` track.
  - Hit the replay limit on a track — confirm Play is disabled until the player
    submits or skips.
  - With one remaining `unanswered` track left, skip several `skipped` rounds —
    confirm focus prefers the `unanswered` track regardless of list order.

## Open questions and known risks

- **Cross-device resume.** Progress is intentionally per-device. If player
  accounts later sync collection state, decide whether quiz progress should also
  sync — and how to handle conflicts when the same account answers the same quiz
  path from two devices.
- **Replay-limit input bounds.** The gate currently floors negative input to `0`
  (unlimited) and accepts any non-negative integer. Very large values are
  equivalent to unlimited; consider a sensible cap if it becomes a UX problem.
- **In-progress list cleanup.** `InProgressQuizSection` scans `localStorage` but
  never expires entries. A quiz path with no live category still appears as
  resumable; clicking it lands on the home page (redirect). A janitor that drops
  keys older than N days might be worthwhile if the home page list grows long.
