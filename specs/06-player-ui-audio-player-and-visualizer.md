# 06 — Player UI: audio player and visualizer

> The interactive layer of the quiz page. The `AudioPlayer` island owns the Web
> Audio graph, the play / stop control, gain normalization, and clip windowing.
> The `AudioVisualizer` island owns the mirrored frequency-bar canvases.
> `QuizController` wires both into the quiz state machine.

## Purpose

This subsystem owns:

- The play / stop button, its loading state, and the gesture-safe entry into a
  shared `AudioContext`.
- The Web Audio graph: `<audio>` source → `GainNode` (loudness normalization) →
  `AnalyserNode` (visualizer tap) → destination.
- Clip windowing on the client (start offset, max length, fades), clamped to the
  actual media duration once `loadedmetadata` fires.
- The mirrored-bar visualizer driven from the analyser node.
- The QuizPlayer page shell: difficulty-colored glow halo, mobile-first layout,
  top nav.
- The track-grid navigation and result modal.
- The keyboard space-bar shortcut for play / stop on the active track.

The progress state and skip / submit flow live in spec 04. Audio file serving
and gain measurement live in spec 03. Answer entry lives in spec 05.

## Behavior

### Page shell

[`src/components/quiz/QuizPlayer.tsx`](../src/components/quiz/QuizPlayer.tsx) is
the SSR wrapper for a live quiz: a centered column on phone widths, a top "Home"
button, and a header card. The header is the `PlateauCard` component with a
difficulty-colored soft glow class from
[`src/components/quiz/glow.ts`](../src/components/quiz/glow.ts):

| Difficulty | Class                       | RGB triplet (visualizer accent) |
| ---------- | --------------------------- | ------------------------------- |
| `easy`     | `glow glow-soft glow-green` | `[34, 197, 94]`                 |
| `hard`     | `glow glow-soft glow-red`   | `[239, 68, 68]`                 |

The same map drives:

- The strong glow on result modals (`resultGlowClass`) for correct vs incorrect.
- The visualizer accent (`difficultyAccentRgb`).
- A neutral fallback (`NEUTRAL_ACCENT_RGB = [148, 163, 184]`) used when no
  difficulty is provided.

The `QuizController` island renders inside the shell and provides the gameplay
UI.

### Audio player island

[`src/islands/AudioPlayer.tsx`](../src/islands/AudioPlayer.tsx) is the
interactive audio surface.

State and Web Audio graph:

- Three play states: `Idle`, `Loading`, `Playing` (with a 500 ms loading-UI
  delay before showing the spinner so brief network blips do not flash).
- A module-level `sharedAudioContext` is lazily constructed on first user
  gesture (`getSharedAudioContext()`) — mobile browsers block context creation
  before a gesture.
- On play: the `<audio>` element is connected to a `GainNode` (set through
  `playbackGainDbToLinear(clampPlaybackGainDb(db))`) → an `AnalyserNode`
  (`fftSize = 64`, `smoothingTimeConstant = 0.8`) → the context destination.
- The analyser is exposed to `AudioVisualizer` only while the clip is actively
  playing.

Clip timing resolution:

- Default `playStartSeconds` / `maxPlaySeconds` come from the server payload
  (after `resolvePlayStartSeconds` / `resolveMaxPlaySeconds`, see spec 03).
- The admin form path (`syncFormId` prop) lets the admin Track edit page preview
  live form values by parsing the form on each render via
  `parseTrackPlaybackFormFields`.
- After `loadedmetadata` fires, `effectiveClipTimings` calls
  `clampStartAndMaxToDuration` so the resolved window always fits the file.

User-facing controls:

- A play button (FaPlay) with the difficulty-colored glow.
- A stop button (FaStop) shown during playback.
- A spinner (SpinningIcon) shown during the loading window.
- The play button is disabled when the parent passes `disabled={true}`
  (replay-limit reached, answer locked, or audio unavailable).
- Stable DOM ids (`listen-play-${audioId}`, `listen-stop-${audioId}`) let
  `QuizController`'s space-bar shortcut click the right control.

### Audio visualizer island

[`src/islands/AudioVisualizer.tsx`](../src/islands/AudioVisualizer.tsx) is a
small island wrapping two canvases on either side of the play button so the bars
_mirror_ outward from the center child.

Pattern details worth knowing:

- **Signal-bridging.** Raw props are NOT reactive dependencies of
  `useSignalEffect`. The island copies `analyserNode`, `active`, and
  `accentDifficulty` into local signals every render so the effect re-runs when
  the parent flips them.
- **`ResizeObserver`** tracks canvas size; per-frame DOM reads of `clientWidth`
  / `clientHeight` are avoided. Device-pixel-ratio scaling is recomputed in the
  observer callback.
- **`getContext("2d")` is cached** at effect setup (`CanvasState`) so the
  per-frame path only calls `fillRect` and `clearRect`.
- **`fillStyle` is pre-computed once per effect** from the accent triplet (or
  the neutral triplet). The per-frame loop only iterates bars.
- **Bar count is fixed at 24** (`BAR_COUNT`); slot width is `width / bars`, bar
  width is 60% of the slot, gap is the remaining 40%.
- **Two directions**: the right canvas draws `ltr` (bin 0 on the left edge →
  strongest bar nearest the center child); the left canvas draws `rtl` so the
  pair forms a symmetric, center-out display.
- **`enabled: false`** skips the canvases entirely and renders only the child
  (used in compact admin previews).

### Track navigation and result modal

- [`src/islands/QuizTrackNav.tsx`](../src/islands/QuizTrackNav.tsx) — the grid /
  list of 20 track buttons with status badges. Clicking a track sets it as
  active.
- [`src/components/quiz/TrackGridButton.tsx`](../src/components/quiz/TrackGridButton.tsx),
  [`src/components/quiz/TrackIndicatorButton.tsx`](../src/components/quiz/TrackIndicatorButton.tsx)
  — individual track row / cell with status color and icon.
- [`src/islands/GuessResultModal.tsx`](../src/islands/GuessResultModal.tsx) —
  modal shown after submit. Displays correct vs incorrect with the matching
  `resultGlowClass`, the canonical title, an optional collection progress line
  (see spec 07), and a Dismiss button that advances to the next round.

### Keyboard shortcut

`QuizController` (spec 04) installs a `document` keydown listener during the
gameplay screen. Pressing `Space` while no interactive element has focus
(`src/lib/keyboard.ts:isInteractiveFocus`) triggers a click on either
`listen-stop-<active>` if visible, or `listen-play-<active>` if enabled. The
active track id is used so a mid-quiz active-track change correctly retargets
the shortcut.

### Edge cases

- **Track marked `unavailable`.** The player slot renders a static message
  ("This track is unavailable, so this round is auto-marked correct.") instead
  of `AudioPlayer`. No play button is shown.
- **Replay limit reached.** `AudioPlayer` receives `disabled={true}`, the play
  button is disabled, and the space-bar shortcut becomes a no-op (play has the
  `disabled` attribute).
- **AudioContext blocked.** On first gesture the context resumes; on iOS
  browsers the context is `suspended` until a user gesture, so the play handler
  MUST call `context.resume()` before scheduling playback.
- **`enabled: false` visualizer.** Used in places like a compact admin track
  preview to avoid running rAF for a non-visible canvas.

## Data model

No tables. The data flow into this subsystem is the per-round `QuizTrackPayload`
(spec 02) and the player-local state owned by `QuizController` (spec 04). The
output is a Web Audio graph and a rendered `<canvas>` pair — no persistence.

## Key files

- **Islands (client)**
  - [`src/islands/AudioPlayer.tsx`](../src/islands/AudioPlayer.tsx).
  - [`src/islands/AudioVisualizer.tsx`](../src/islands/AudioVisualizer.tsx).
  - [`src/islands/QuizController.tsx`](../src/islands/QuizController.tsx) —
    parent that threads `accentDifficulty` and active state into the player and
    visualizer.
  - [`src/islands/QuizTrackNav.tsx`](../src/islands/QuizTrackNav.tsx).
  - [`src/islands/GuessResultModal.tsx`](../src/islands/GuessResultModal.tsx).
- **Components (SSR)**
  - [`src/components/quiz/QuizPlayer.tsx`](../src/components/quiz/QuizPlayer.tsx)
    — page shell with difficulty glow header.
  - [`src/components/quiz/AudioTrackPlayer.tsx`](../src/components/quiz/AudioTrackPlayer.tsx)
    — layout wrapper for the active track row.
  - [`src/components/quiz/glow.ts`](../src/components/quiz/glow.ts) — glow class
    maps and accent RGB triplets.
  - [`src/components/quiz/TrackGridButton.tsx`](../src/components/quiz/TrackGridButton.tsx),
    [`src/components/quiz/TrackIndicatorButton.tsx`](../src/components/quiz/TrackIndicatorButton.tsx),
    [`src/components/quiz/QuizResults.tsx`](../src/components/quiz/QuizResults.tsx),
    [`src/components/quiz/QuizResultRow.tsx`](../src/components/quiz/QuizResultRow.tsx),
    [`src/components/quiz/GuessResultContent.tsx`](../src/components/quiz/GuessResultContent.tsx).
- **Server-only helpers**
  - [`src/lib/quizPlayback.ts`](../src/lib/quizPlayback.ts),
    [`src/lib/playbackGainMath.ts`](../src/lib/playbackGainMath.ts),
    [`src/lib/audioListenUrl.ts`](../src/lib/audioListenUrl.ts) — see spec 03.
  - [`src/lib/keyboard.ts`](../src/lib/keyboard.ts) — `isInteractiveFocus`.

## Constraints and invariants

- **Principle III — Mobile-first playability.** Every control is designed for a
  tap target. Audio cannot start without a gesture. The layout collapses cleanly
  to phone widths (single column, full-width buttons).
- **Principle VII — Components are SSR-only; islands own client behavior.**
  Canvas access, `AudioContext`, `requestAnimationFrame`, and `document` event
  listeners all live in islands. The `QuizPlayer` shell, the glow classes, and
  the result modal markup live in `components/` and have no client behavior.
- **Signals-only client reactivity.** Both islands use `useSignal` and
  `useSignalEffect`. No `useState` / `useEffect` / `useRef` imports from
  `preact/hooks`. The visualizer's signal-bridging pattern is the required idiom
  for any island reading raw props inside `useSignalEffect`.
- **Audio source of truth.** The audio element is the source for the Web Audio
  graph; the player does not preload bytes ahead of the active track and never
  bundles audio.
- **Single shared `AudioContext`.** Avoids one context per island / per track,
  which both wastes resources and runs afoul of per-page-context limits on some
  browsers.

## Verification approach

- **Unit / integration:** the islands are not directly unit-tested; pure helpers
  they depend on (`quiz_playback_test.ts`, `audioListenUrl_test.ts`, gain
  helpers) cover the math.
- **Manual:**
  - Open a quiz on a mobile viewport in Chrome, Safari, and Firefox. Press Play
    — confirm playback starts within the loading window and the bars animate
    symmetrically around the play button.
  - Stop mid-clip — bars clear, button reverts to Play.
  - Open a `hard` quiz — confirm header glow is red and visualizer bars are red.
  - Open an admin track edit page — confirm the preview player respects live
    `playStartSeconds` / `maxPlaySeconds` form values.
  - With keyboard focus outside the answer input, press Space — confirm the
    active track toggles play / stop. With focus inside the input, Space MUST
    type a space character.

## Open questions and known risks

- **`AudioContext` lifecycle on navigation.** The shared context is
  module-scoped. On client-side navigation between quizzes (today this is a full
  page load, but a future SPA shell would break this), the context would survive
  and accumulate gain / analyser nodes. Tear-down in a future refactor.
- **Visualizer cost.** `fftSize = 64` (32 bins) → 24 bars is cheap, but if the
  bar count or smoothing is increased, profile on a low-end phone before
  shipping.
- **Color regression risk.** The accent RGB triplets in `glow.ts` are hard-coded
  and must stay in sync with the Tailwind palette referenced by the `glow-green`
  / `glow-yellow` / `glow-red` classes. If Tailwind colors are rebranded, both
  surfaces must be updated together — flag this in any palette PR.
