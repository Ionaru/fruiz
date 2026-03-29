# Feature Specification: Skip advances to next clip

**Feature Branch**: `003-skip-advances-next-clip`\
**Created**: 2026-03-29\
**Status**: Implemented\
**Input**: Product feedback: skip should move the player to the next clip after
marking the current track skipped.

## Overview

During an active quiz, the **Skip** control marks the current track as skipped
(in progress state) and MUST then move focus to another clip according to the
rules below, so the player is not left on the same track in the main player
panel. Track order is the ordered list of tracks in the current quiz instance
(the same order used for clip numbering in the UI).

**Implementation reference**: client logic lives in
[`islands/QuizController.tsx`](../../islands/QuizController.tsx) (`onSkip`).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Skip moves forward in sequence (Priority: P1)

As a player, when I skip a clip that is not the last in the quiz order, I want
the app to show the **next** clip in that order so I can continue without
manually picking the next square.

**Why this priority**: This is the default expectation for “skip” in a linear
flow and matches clip numbering (1 → 2 → …).

**Independent Test**: With at least two clips remaining incomplete, activate a
clip that has a successor in list order, press Skip, and confirm the active
clip index increases by one and the audio player targets the new clip.

**Acceptance Scenarios**:

1. **Given** the active track is not the last in quiz order and its progress is
   not `correct` or `incorrect`, **When** the player activates Skip, **Then** the
   current track is recorded as `skipped` and the active track becomes the next
   track in quiz order.
2. **Given** the scenario in (1), **When** Skip completes, **Then** the answer
   draft for the new active track matches that track’s stored `selectedTitle`,
   or is empty if none (same behavior as selecting a track in the overview grid).

---

### User Story 2 - Skip on last clip still finds work left (Priority: P2)

As a player, when I skip the **last** clip in order but other clips still need
attention (`unanswered` or `skipped`), I want focus to jump to the **first** such
clip in list order so I am not stuck on the last tile only.

**Why this priority**: Finishing the quiz still requires resolving every track;
moving to an earlier incomplete clip reduces friction.

**Independent Test**: Leave an earlier clip incomplete, move to the last clip,
skip it, and confirm the active clip is the first incomplete in order (not the
last, when another incomplete exists).

**Acceptance Scenarios**:

1. **Given** the active track is the last in quiz order and at least one other
   track is `unanswered` or `skipped`, **When** the player activates Skip,
   **Then** after marking the current track skipped, the active track becomes
   the first track in quiz order whose status is `unanswered` or `skipped`,
   **provided** that track is not the same as the track that was active before
   the skip (see Edge Cases when it is the same).

---

### Edge Cases

- **Already finalized (`correct` / `incorrect`)**: Skip MUST NOT change progress
  or active track. (The Skip control is expected to be disabled in this state;
  the handler still guards defensively.)
- **No active track**: If there is no active track id, Skip does nothing.
- **Last clip, sole incomplete**: If the only tracks still `unanswered` or
  `skipped` are exactly the one just skipped (i.e. first incomplete in order is
  still that same clip), the active track MUST remain that clip so the player
  can answer or skip again only as allowed by other rules.
- **Repeat Skip on an already skipped clip**: Marking skipped again is
  idempotent; navigation rules still apply (e.g. advance to next in order if
  present).
- **Audio**: Switching the active track MUST cause the visible audio player to
  correspond to the new clip (e.g. via a stable remount key per track id).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: On Skip, the system MUST set the current track’s progress to
  `skipped` with no selected title when the track was not already `correct` or
  `incorrect`, consistent with existing quiz progress persistence.
- **FR-002**: After FR-001, if there is a next track in quiz list order, the
  system MUST set the active track to that next track and sync the answer draft
  from that track’s progress (`selectedTitle` or empty).
- **FR-003**: After FR-001, if there is no next track in quiz list order, the
  system MUST set the active track to the first track in quiz list order whose
  status is `unanswered` or `skipped`, **unless** the only such track is the
  track that was active for this skip action—in which case the active track MUST
  remain unchanged.
- **FR-004**: If the active track was already `correct` or `incorrect` before
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
