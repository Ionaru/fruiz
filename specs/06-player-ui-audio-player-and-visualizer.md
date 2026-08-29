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
  and the shared site header (spec 01).
- The track-grid navigation and result modal.
- The keyboard space-bar shortcut for play / stop on the active track.

The progress state and skip / submit flow live in spec 04. Audio file serving
and gain measurement live in spec 03. Answer entry lives in spec 05.

## Behavior

### Page shell

[`src/components/quiz/QuizPlayer.tsx`](../src/components/quiz/QuizPlayer.tsx) is
the SSR wrapper for a live quiz: a centered column on phone widths, the shared
[`SiteHeader`](../src/components/layout/SiteHeader.tsx) (spec 01), and a header
card. The header card is the `PlateauCard` component with a difficulty-colored
soft glow class from
[`src/components/quiz/glow.ts`](../src/components/quiz/glow.ts):

| Difficulty | Header (soft glow) class                           | Visualizer bars |
| ---------- | -------------------------------------------------- | --------------- |
| `easy`     | `glow glow-soft glow-green`                        | neutral gray    |
| `hard`     | `glow glow-soft glow-rainbow glow-rainbow-animate` | neutral gray    |

`hard` uses an animated rainbow halo (`.glow-rainbow` + `.glow-rainbow-animate`,
defined in [`src/assets/styles.css`](../src/assets/styles.css)) instead of a
single accent color. The rainbow is a blurred `conic-gradient` on the glow
`::before`; `.glow-rainbow-animate` cycles the hue via `hue-rotate` and is
disabled under `prefers-reduced-motion: reduce`. The category-select difficulty
buttons (strong glow) keep `glow-red` for `hard`.

The supporting maps:

- `difficultyGlowClass` (strong) drives the category-select buttons; `hard`
  stays `glow-red` there.
- The strong glow on result modals (`resultGlowClass`) for correct vs incorrect.
- The visualizer bars are not difficulty-colored: they use the
  `--color-base-400` token (a muted neutral gray, read via
  `getComputedStyle(canvas).getPropertyValue("--color-base-400")`, falling back
  to `#9A9A9E`), which reads on both the light and dark themes.

The `QuizController` island renders inside the shell and provides the gameplay
UI.

### Audio player island

[`src/islands/AudioPlayer.tsx`](../src/islands/AudioPlayer.tsx) is the
interactive audio surface.

State and Web Audio graph:

- Three play states: `Idle`, `Loading`, `Playing` (with a 500 ms loading-UI
  delay before showing the spinner so brief network blips do not flash). A
  paused player under `pauseInsteadOfStop` sits in `Idle` with its position
  kept, so resuming is a `play()` that skips the seek.
- **The graph is built on first play, not on mount.** `ensureGraph(el)` is
  called from `play()`; `MediaElementSource` may only be created once per
  element, so the identity check is load-bearing. This matters because the
  collection page renders a player per categorized track — building a source, an
  analyser and a gain node for each on mount would open hundreds of Web Audio
  nodes to play at most one of them.
- **Effects are component-scoped.** Every effect in the island uses
  `useSignalEffect`, never the module-level `effect()`. The latter builds a
  fresh, never-disposed effect on each render, and one of them owns the media
  element's event listeners — on a long, frequently re-rendered list that leaks
  a listener set per render.
- A module-level `sharedAudioContext` is lazily constructed on first user
  gesture (`getSharedAudioContext()`) — mobile browsers block context creation
  before a gesture.
- On play: the `<audio>` element is connected to a `GainNode` (set through
  `playbackGainDbToLinear(clampPlaybackGainDb(db))`) → an `AnalyserNode`
  (`fftSize = 1024`, `smoothingTimeConstant = 0.8`, `minDecibels = -90`,
  `maxDecibels = -5`) → the context destination. The 1024-point FFT (512 bins)
  gives the visualizer's log-spaced band mapping enough low-end resolution to
  separate the bass. The analyser sits **before** the gain node, so it sees raw
  full-scale audio; the widened dB window (default is `-100..-30`) stops loud
  tracks from saturating every bar to full height.
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
- A stop button (FaStop) shown during playback — or a pause button (FaPause,
  `success` rather than `danger`) when the caller opts into
  `pauseInsteadOfStop`.
- A spinner (SpinningIcon) shown during the loading window.
- The play button is disabled when the parent passes `disabled={true}`
  (replay-limit reached, answer locked, or audio unavailable).
- Stable DOM ids (`listen-play-${audioId}`, `listen-stop-${audioId}`) let
  `QuizController`'s space-bar shortcut click the right control.

Optional behaviors, all defaulted off so the quiz and admin call sites are
unchanged:

- **`pauseInsteadOfStop`** — stopping keeps the position instead of rewinding to
  the clip start, and the control shows a pause glyph. The default matters: the
  quiz needs stop-and-rewind so a replay costs a full listen rather than
  resuming the tail. The icon follows the behavior, because a pause glyph over
  stop-and-rewind would be lying about what the button does.
- **`activePlayerId`** — names the player that currently owns playback. When it
  names a different one, this player stops, so a list of rows can never have two
  clips audible at once. Being preempted **always rewinds**, even under
  `pauseInsteadOfStop`: pausing is something the listener chooses, and starting
  another track should not scatter half-played rows down the list.
- **`row`** — renders the player as a single track row (one card holding a label
  column and the control) instead of the default centred stack, taking `primary`
  and `secondary` label slots plus a `label` string for the control's accessible
  name. The player owns the card because all three of the row's playing-state
  changes — the glow, the swap of `secondary` for the waveform, and the pause
  glyph — depend on state that only this island holds. While playing,
  `secondary` gives way to an inline visualizer and an elapsed-time readout
  (`formatPlaybackTime`, fed by a `timeupdate` listener writing to a signal).

### Audio visualizer island

[`src/islands/AudioVisualizer.tsx`](../src/islands/AudioVisualizer.tsx) is a
small island with two layouts. The default, `"flanking"`, wraps two canvases on
either side of the play button so the bars _mirror_ outward from the center
child. `"inline"` draws a single short left-to-right strip (12 bands rather than
24, because 24 in ~80px would render as slivers) and renders no children — the
collection row places its control separately, beside the label column. Both
share the same drawing code, resting line, collapse tween, midline centring and
`--color-base-400` fill.

Pattern details worth knowing:

- **Signal-bridging.** Raw props are NOT reactive dependencies of
  `useSignalEffect`. The island copies `analyserNode` and `active` into local
  signals every render so the effect re-runs when the parent flips them.
- **`ResizeObserver`** tracks canvas size; per-frame DOM reads of `clientWidth`
  / `clientHeight` are avoided. Device-pixel-ratio scaling is recomputed in the
  observer callback.
- **`getContext("2d")` is cached** at effect setup (`CanvasState`) so the
  per-frame path only calls `fillRect` and `clearRect`.
- **Fill is resolved once per effect** as the `--color-base-400` token (a muted
  neutral gray; `|| "#9A9A9E"` fallback so an unresolved/empty value still
  yields a valid color); the per-frame loop sets `fillStyle` once and applies
  the same color to every bar.
- **Bar count is fixed at 24** (`BAR_COUNT`); slot width is `width / bars`, bar
  width is 60% of the slot, gap is the remaining 40%.
- **Log-spaced bands + treble tilt.** Raw `getByteFrequencyData` bins are
  _linear_ in Hz, so a direct bin → bar mapping pins the bass bars at full
  height and flattens the high bars on every track. The pure helpers in
  [`src/lib/audioSpectrum.ts`](../src/lib/audioSpectrum.ts) fix this: each bar
  averages the bins inside a **log-spaced** bin-index band (≈ a constant pitch
  ratio per bar, like octaves), and a per-bar **treble tilt** (`SPECTRUM_TILT`)
  multiplies magnitudes up toward the high end to counter music's bass-heavy
  spectral tilt. The top ~quarter of bins (`SPECTRUM_MAX_BIN_FRACTION`, ≈ 16 kHz
  and up) is dropped because it carries almost no musical energy. Band edges
  (`computeLogBandEdges`) and tilt weights (`computeTiltWeights`) are computed
  once per effect; the per-frame `fillSpectrumBars` only averages bins into the
  reused magnitude buffer (allocation-free).
- **Centered geometry.** Each bar is centered on the vertical midline
  (`y = (height - barHeight) / 2`) and grows symmetrically up and down, so the
  visible energy lines up with the play/stop button and rising magnitudes expand
  in both directions. Magnitudes are normalized to `0..1` and floored to
  `RESTING_FRACTION` (`0.08`) inside `drawBars`.
- **Bars are always rendered.** When idle, all bars sit at `RESTING_FRACTION` —
  a thin resting line on the centerline — instead of a blank canvas. The
  `ResizeObserver` callback redraws the resting line when no animation loop owns
  the canvas.
- **Stop eases back to rest.** While playing, the live magnitude buffer is
  exposed once via a `useSignal` and read later via `.peek()` (so the effect
  never subscribes and the write doesn't re-trigger it; the buffer is mutated in
  place each frame and stops mutating once the loop is cancelled). When `active`
  flips false, a short `requestAnimationFrame` tween (`COLLAPSE_MS`,
  ease-out-cubic, timestamps from the rAF argument) collapses the bars from the
  snapshot down to the resting line. The playing render itself is unchanged.
- **Restart flush.** When the live loop (re)starts, it momentarily sets the
  analyser's `smoothingTimeConstant` to `0` for one throwaway
  `getByteFrequencyData` read, then restores it. The analyser sits before the
  gain node and freezes its smoothed buffer when audio pauses; without the
  flush, smoothing blends that stale frame in and a restart visibly jumps to the
  previous stop point.
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
    parent that threads active state into the player and visualizer.
  - [`src/islands/QuizTrackNav.tsx`](../src/islands/QuizTrackNav.tsx).
  - [`src/islands/GuessResultModal.tsx`](../src/islands/GuessResultModal.tsx).
- **Components (SSR)**
  - [`src/components/quiz/QuizPlayer.tsx`](../src/components/quiz/QuizPlayer.tsx)
    — page shell with difficulty glow header.
  - [`src/components/quiz/AudioTrackPlayer.tsx`](../src/components/quiz/AudioTrackPlayer.tsx)
    — layout wrapper for the active track row.
  - [`src/components/quiz/glow.ts`](../src/components/quiz/glow.ts) — glow class
    maps.
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
  - [`src/lib/audioSpectrum.ts`](../src/lib/audioSpectrum.ts) — pure log-band +
    treble-tilt FFT mapping for the visualizer bars.

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
  they depend on (`quiz_playback_test.ts`, `audioListenUrl_test.ts`,
  `audioSpectrum_test.ts`, gain helpers) cover the math. The log-band/tilt
  mapping is covered by `tests/unit/lib/audioSpectrum_test.ts`.
- **Manual:**
  - Open a quiz on a mobile viewport in Chrome, Safari, and Firefox. Confirm a
    thin resting bar line is visible on the centerline before play. Press Play —
    confirm playback starts within the loading window and the bars expand
    symmetrically up and down from the centerline, in line with the button.
  - Stop mid-clip — bars ease back down to the resting line (no blank flash),
    button reverts to Play.
  - Open a `hard` quiz — confirm the header glow is an animated rainbow (the
    visualizer bars stay the neutral gray, not difficulty-colored). With OS
    "reduce motion" on, the header rainbow stops animating (static). Confirm the
    category-select `hard` button stays red.
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
- **Visualizer cost.** `fftSize = 1024` (512 bins) → 24 bars. The per-frame work
  is one `getByteFrequencyData` plus averaging ≈ 384 bins (`fillSpectrumBars`),
  still cheap, but if the bar count, FFT size, or smoothing is increased,
  profile on a low-end phone before shipping.
- **Visualizer tuning.** `SPECTRUM_TILT`, `SPECTRUM_MAX_BIN_FRACTION`, and
  `SPECTRUM_MIN_BIN` in `src/lib/audioSpectrum.ts` are purely aesthetic dials.
  Raising `SPECTRUM_TILT` makes the high bars livelier; lowering it toward `0`
  gives a faithful, bass-dominant display.
- **Color regression risk.** The glow halo colors in `glow.ts` / `styles.css`
  (`glow-green`, `glow-red`, and the `.glow-rainbow` conic-gradient stops) are
  hard-coded and must stay in sync with the Tailwind palette. If Tailwind colors
  are rebranded, update them together — flag this in any palette PR. The
  visualizer bars carry no palette of their own (they use the `--color-base-400`
  neutral token) and so need no sync.
- **Reduced motion.** The rainbow header animation is gated by
  `prefers-reduced-motion: reduce`; the visualizer bars use a static color
  (their height motion is the audio visualization, not decorative).
