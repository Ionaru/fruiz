# Feature Specification: Skip advances to next clip

**Feature Branch**: `003-skip-advances-next-clip`\
**Created**: 2026-03-29\
**Updated**: 2026-04-01\
**Status**: Implemented\
**Input**: Product feedback: skip should move the player to the next clip after
marking the current track skipped.

## Overview

During an active quiz, the **Skip** control marks the current track as skipped
(in progress state) and MUST then move focus to another clip according to the
rules below, so the player is not left on the same track in the main player
panel. Track order is the ordered list of tracks in the current quiz instance
(the same order used for clip numbering in the UI).

Navigation after skip uses a **circular** scan starting at the track **after**
the current index (wrapping to the start after the last track). While **any**
track in the quiz remains `unanswered`, the active track becomes the **first**
`unanswered` track hit by that scan. If **no** track is `unanswered`, the
active track becomes the **first** `skipped` track hit by the same scan (so
previously skipped clips are only auto-selected when nothing is still
never-skipped).

**Implementation reference**: client logic lives in
[`islands/QuizController.tsx`](../../islands/QuizController.tsx) (`onSkip`,
`findNextTrackAfterSkip`).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Skip moves to next unanswered in order (Priority: P1)

As a player, when I skip a clip and other clips are still `unanswered`, I want
the app to focus the **next** such clip in list order (wrapping past the end),
so I continue with fresh clips before revisiting ones I already skipped.

**Why this priority**: Avoids bouncing back into skipped tiles while untouched
work remains.

**Independent Test**: Order A `unanswered`, B `skipped`, C `unanswered`. Active
C, Skip — confirm active becomes A (wrap), not B.

**Acceptance Scenarios**:

1. **Given** at least one track is `unanswered` after the skip update, **When**
   the player activates Skip from a non-finalized track, **Then** the current
   track is `skipped` and the active track is the first `unanswered` track in
   circular order starting after the current index.
2. **Given** the scenario in (1), **When** Skip completes, **Then** the answer
   draft for the new active track matches that track’s stored `selectedTitle`,
   or is empty if none (same behavior as selecting a track in the overview
   grid).

---

### User Story 2 - Skip wraps and prefers earlier unanswered work (Priority: P2)

As a player, when I skip the **last** clip in order but an earlier clip is still
`unanswered`, I want focus to wrap to that clip rather than stay on the last
tile.

**Why this priority**: Finishing the quiz still requires resolving every track;
wrapping removes friction at list boundaries.

**Independent Test**: Leave track 1 `unanswered`, go to last track, Skip — confirm
active is track 1 (or the first `unanswered` encountered after wrapping).

**Acceptance Scenarios**:

1. **Given** the active track is last in quiz order and at least one other track
   is `unanswered`, **When** the player activates Skip, **Then** after marking
   the current track skipped, the active track is the first `unanswered` in the
   circular scan (typically an earlier index), not necessarily index + 1.

---

### User Story 3 - Skip falls back to skipped when no unanswered left (Priority: P2)

As a player, when every remaining incomplete track is already `skipped`, I want
Skip to move to the **next** `skipped` track in the same circular order so I can
work through the backlog.

**Independent Test**: All incomplete tracks `skipped`, active on one of them,
Skip — confirm active advances to another `skipped` in circular order, or stays
if it is the sole incomplete.

**Acceptance Scenarios**:

1. **Given** no track has status `unanswered` after the skip update, **When**
   the player activates Skip, **Then** the active track is the first `skipped`
   track in the circular scan (including wrapping).

---

### Edge Cases

- **Already finalized (`correct` / `incorrect`)**: Skip MUST NOT change progress
  or active track. (The Skip control is expected to be disabled in this state;
  the handler still guards defensively.)
- **No active track**: If there is no active track id, Skip does nothing.
- **Sole incomplete**: If the only `unanswered` / `skipped` track is the one
  that was active, the circular scan only matches at full wrap — the active track
  stays the same so the player can answer or skip again per other rules.
- **Repeat Skip on an already skipped clip**: Marking skipped again is
  idempotent; navigation rules still apply.
- **Audio**: Switching the active track MUST cause the visible audio player to
  correspond to the new clip (e.g. via a stable remount key per track id).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: On Skip, the system MUST set the current track’s progress to
  `skipped` with no selected title when the track was not already `correct` or
  `incorrect`, consistent with existing quiz progress persistence.
- **FR-002**: After FR-001, the system MUST set the active track by scanning
  indices `(currentIndex + 1) % n` … through `n` steps in quiz list order (`n` =
  track count). If any track in the quiz has status `unanswered`, the active
  track MUST be the first whose status is `unanswered` in that scan.
- **FR-003**: After FR-001, if no track has status `unanswered`, the active track
  MUST be the first whose status is `skipped` in the same circular scan. If no
  matching track exists (defensive), the active track ID MUST remain unchanged.
- **FR-004**: After FR-002/FR-003, the answer draft MUST match the new active
  track’s `selectedTitle` or be empty if none.
- **FR-005**: If the active track was already `correct` or `incorrect` before
  handling Skip, the system MUST NOT update progress or active track for that
  action.

### Non-Goals (out of scope)

- Changing when the quiz is considered complete (skipped tracks remain
  incomplete until answered per existing product rules).
- Adding new navigation controls or changing the track overview grid layout.
- Server-side or API changes; behavior is player-local UI and persisted progress
  only.

## Assumptions

- “Quiz list order” is `props.tracks` order for the loaded quiz instance.
- Progress statuses and storage keying follow existing types and
  [`QuizProgress`](../../lib/types.ts) semantics.
