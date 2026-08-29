import type { ComponentChildren } from "preact";
import { useSignal, useSignalEffect } from "@preact/signals";
import { useSignalRef } from "@preact/signals/utils";
import { buildListenSrc } from "../lib/audioListenUrl.ts";

import { Button } from "../components/Button.tsx";
import { AudioVisualizer } from "./AudioVisualizer.tsx";
import {
  clampPlaybackGainDb,
  playbackGainDbToLinear,
} from "../lib/playbackGainMath.ts";
import {
  clampStartAndMaxToDuration,
  FADE_IN_SECONDS,
  FADE_OUT_SECONDS,
  formatPlaybackTime,
  parseTrackPlaybackFormFields,
  resolveMaxPlaySeconds,
  resolvePlayStartSeconds,
} from "../lib/quizPlayback.ts";
import { FaPause, FaPlay, FaStop } from "react-icons/fa6";
import { SpinningIcon } from "../components/ui/SpinningIcon.tsx";

// 1024 → 512 frequency bins, fine enough for the log-spaced band mapping in
// AudioVisualizer to separate the bass without starving the low bars of bins.
const VISUALIZER_FFT_SIZE = 1024;
const VISUALIZER_SMOOTHING = 0.8;
// The analyser taps the signal BEFORE the gain node, so it sees raw full-scale
// audio. The default dB window (-100..-30) saturates loud music to full-height
// bars. Widen the ceiling so only genuine peaks reach the top; the floor stays
// low so quiet detail still registers. dB values below the floor read as 0.
const VISUALIZER_MIN_DB = -90;
const VISUALIZER_MAX_DB = -5;

export enum PlayState {
  Idle = "idle",
  Loading = "loading",
  Playing = "playing",
  /** Stopped where it stood, with the position kept for a later resume. */
  Paused = "paused",
}

const LOADING_UI_DELAY_MS = 500;

let sharedAudioContext: AudioContext | null = null;
function getSharedAudioContext(): AudioContext {
  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContext();
  }
  return sharedAudioContext;
}

function targetLinearFromPlaybackGainDb(db: number | null | undefined): number {
  if (db === null || db === undefined || !Number.isFinite(db)) {
    return 1;
  }
  return playbackGainDbToLinear(clampPlaybackGainDb(db));
}

function effectiveClipTimings(
  playStartSeconds: number,
  maxPlaySeconds: number,
  durationSeconds: number,
): { playStartSeconds: number; maxPlaySeconds: number } {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return { playStartSeconds, maxPlaySeconds };
  }
  return clampStartAndMaxToDuration(
    playStartSeconds,
    maxPlaySeconds,
    durationSeconds,
  );
}

function clipTimingsFromFormOrFallback(
  syncFormId: string | undefined,
  fallbackStart: number,
  fallbackMax: number,
): {
  playStartSeconds: number;
  maxPlaySeconds: number;
  invalidForm: boolean;
} {
  if (!syncFormId) {
    return {
      playStartSeconds: fallbackStart,
      maxPlaySeconds: fallbackMax,
      invalidForm: false,
    };
  }
  const root = document.getElementById(syncFormId);
  if (!(root instanceof HTMLFormElement)) {
    return {
      playStartSeconds: fallbackStart,
      maxPlaySeconds: fallbackMax,
      invalidForm: false,
    };
  }
  const parsed = parseTrackPlaybackFormFields(new FormData(root));
  if (!parsed.ok) {
    return {
      playStartSeconds: fallbackStart,
      maxPlaySeconds: fallbackMax,
      invalidForm: true,
    };
  }
  return {
    playStartSeconds: resolvePlayStartSeconds(parsed.playStartSeconds),
    maxPlaySeconds: resolveMaxPlaySeconds(parsed.maxPlaySeconds),
    invalidForm: false,
  };
}

function seekAudioTo(el: HTMLAudioElement, seconds: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      el.removeEventListener("seeked", onSeeked);
      resolve();
    };
    el.addEventListener("seeked", onSeeked);
    el.currentTime = seconds;
    queueMicrotask(() => {
      if (Math.abs(el.currentTime - seconds) < 0.05) {
        el.removeEventListener("seeked", onSeeked);
        resolve();
      }
    });
  });
}

interface AudioPlayerProps {
  audioId: string;
  /** When true, play is blocked until this becomes false. */
  disabled?: boolean;
  /** Called when audio actually starts (after user gesture). */
  onPlayStart?: () => void;
  /**
   * Called synchronously when play is requested, before any loading begins.
   *
   * Distinct from {@link onPlayStart}, which waits for audio to actually start
   * and drives the quiz's replay accounting. Ownership has to be claimed at the
   * click instead: a player that is still loading would otherwise see
   * {@link activePlayerId} still naming the previous owner and preempt itself.
   */
  onPlayRequested?: () => void;
  /** Smaller controls for dense layouts (e.g. admin lists). */
  compact?: boolean;
  /** Measured playback gain in dB; null/undefined = unity gain. */
  playbackGainDb?: number | null;
  /** Resolved start offset in seconds (from server defaults). */
  playStartSeconds: number;
  /** Resolved max clip length in seconds (includes fades). */
  maxPlaySeconds: number;
  /**
   * When set, start/max clip length are read from this form (`id`) on each
   * play/stop so admins can preview unsaved values. Fallback props are used
   * when the form is missing or fields are invalid (play is blocked if invalid).
   */
  syncPlaybackFromFormId?: string;
  /** Byte size of the audio file — used to cache-bust the listen URL. */
  playbackGainSourceSize?: number | null;
  /** mtime of the audio file in ms since epoch — used to cache-bust the listen URL. */
  playbackGainSourceMtimeMs?: number | null;
  /**
   * When true, no audio request is made until the user first clicks play (no
   * eager metadata fetch). Use on list pages that render many players. Defaults
   * to false: eager `preload="metadata"`, current behavior.
   */
  lazyLoad?: boolean;
  /**
   * Offer a pause control alongside stop, and resume from where pause left off.
   *
   * Defaults to false, which is what the quiz needs: a round only ever stops,
   * and stopping rewinds so the next replay costs a full listen rather than
   * resuming the tail. Free listening in the collection wants both, so it opts
   * in and gets two controls — stop still rewinds, pause keeps the position.
   */
  resumable?: boolean;
  /**
   * Id of the player that currently owns playback, or `null` when none does.
   * When it names a different player this one stops, so a list of rows can
   * never have two clips audible at once. Callers that render a single player
   * omit it and nothing changes.
   *
   * Being preempted always rewinds, even under {@link resumable}: pausing is
   * something the listener chooses, and leaving stale half-played rows
   * scattered down the list is not what starting another track means.
   */
  activePlayerId?: string | null;
  /**
   * Render as a single track row — one card holding a label column, the
   * playback meter and the controls — instead of the default centred stack.
   *
   * The player owns the card because every one of the row's playing-state
   * changes (the glow, the meter, the elapsed time and which controls are
   * offered) depends on state that lives in here. Both label slots are always
   * shown: the meter sits beside the controls rather than replacing
   * `secondary`, so the row is exactly as tall idle as it is playing.
   */
  row?: {
    primary: ComponentChildren;
    secondary: ComponentChildren;
    /**
     * What the controls are acting on, e.g. the track title. It becomes part of
     * each button's accessible name: a list of 241 buttons all announcing
     * "Play, button" tells a screen-reader user nothing about which is which.
     */
    label: string;
  };
}

export function AudioPlayer(props: Readonly<AudioPlayerProps>) {
  const audioRef = useSignalRef<HTMLAudioElement | null>(null);
  const playState = useSignal(PlayState.Idle);
  /** Shown only after {@link LOADING_UI_DELAY_MS} in {@link PlayState.Loading} to avoid flicker. */
  const loadingUiVisible = useSignal(false);
  /** After the first `playing` in a session, loading UI is immediate (rebuffer), not delayed. */
  const hasStartedPlayback = useSignal(false);
  /** True until the first `playing` event after `play()` (skips rebuffer `playing`). */
  const pendingPlayStartNotification = useSignal(false);
  /** Live playback position, for the row layout's readout. Only tracked while playing. */
  const elapsedSeconds = useSignal(0);

  const playbackGainSig = useSignal(props.playbackGainDb ?? null);
  playbackGainSig.value = props.playbackGainDb ?? null;

  const fallbackStartSig = useSignal(props.playStartSeconds);
  const fallbackMaxSig = useSignal(props.maxPlaySeconds);
  fallbackStartSig.value = props.playStartSeconds;
  fallbackMaxSig.value = props.maxPlaySeconds;

  const formPlaybackError = useSignal<string | null>(null);

  const graphSig = useSignal<
    {
      gainNode: GainNode;
      analyserNode: AnalyserNode;
      el: HTMLMediaElement;
    } | null
  >(null);

  const clipStopTimerId = useSignal<number | undefined>(undefined);

  const clearClipStopTimer = () => {
    const timerId = clipStopTimerId.value;
    if (timerId !== undefined) {
      globalThis.clearTimeout(timerId);
      clipStopTimerId.value = undefined;
    }
  };

  const silenceGainNow = () => {
    const graph = graphSig.value;
    const ctx = sharedAudioContext;
    if (!graph || !ctx) return;
    const now = ctx.currentTime;
    graph.gainNode.gain.cancelScheduledValues(now);
    graph.gainNode.gain.setValueAtTime(0, now);
  };

  /**
   * Wires the Web Audio graph for this element, once. `MediaElementSource` may
   * only be created once per element, so the identity check is load-bearing.
   *
   * Called from `play()` rather than from a mount effect: the collection lists
   * every categorized track, and building a source, an analyser and a gain node
   * for each one on mount would open hundreds of Web Audio nodes to play at
   * most one of them. A click is also the ideal moment — it is the user gesture
   * the AudioContext needs anyway.
   */
  const ensureGraph = (el: HTMLMediaElement) => {
    const existing = graphSig.value;
    if (existing && existing.el === el) return existing;
    const ctx = getSharedAudioContext();
    const source = ctx.createMediaElementSource(el);
    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = VISUALIZER_FFT_SIZE;
    analyserNode.smoothingTimeConstant = VISUALIZER_SMOOTHING;
    analyserNode.maxDecibels = VISUALIZER_MAX_DB;
    analyserNode.minDecibels = VISUALIZER_MIN_DB;
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0;
    source.connect(analyserNode);
    analyserNode.connect(gainNode).connect(ctx.destination);
    const graph = { gainNode, analyserNode, el };
    graphSig.value = graph;
    return graph;
  };

  /** Drops a stale graph, and keeps an idle one's gain in step with its prop. */
  useSignalEffect(() => {
    const el = audioRef.value;
    if (!el) {
      graphSig.value = null;
      return;
    }
    const existing = graphSig.value;
    if (
      existing && existing.el === el && playState.value === PlayState.Idle
    ) {
      existing.gainNode.gain.value = targetLinearFromPlaybackGainDb(
        playbackGainSig.value,
      );
    }
  });

  useSignalEffect(() => {
    const state = playState.value;
    if (state !== PlayState.Loading) {
      loadingUiVisible.value = false;
      return;
    }
    if (hasStartedPlayback.value) {
      loadingUiVisible.value = true;
      return;
    }
    const delayId = globalThis.setTimeout(() => {
      if (playState.value === PlayState.Loading) {
        loadingUiVisible.value = true;
      }
    }, LOADING_UI_DELAY_MS);
    return () => globalThis.clearTimeout(delayId);
  });

  useSignalEffect(() => {
    const el = audioRef.value;
    if (!el) return;

    const clearPendingPlayStart = () => {
      pendingPlayStartNotification.value = false;
    };

    const resetPlaySession = () => {
      clearPendingPlayStart();
      clearClipStopTimer();
      silenceGainNow();
      pendingPlayStartNotification.value = false;
      hasStartedPlayback.value = false;
      playState.value = PlayState.Idle;
      elapsedSeconds.value = 0;
      const duration = el.duration;
      const raw = clipTimingsFromFormOrFallback(
        props.syncPlaybackFromFormId,
        fallbackStartSig.value,
        fallbackMaxSig.value,
      );
      const { playStartSeconds } = effectiveClipTimings(
        raw.playStartSeconds,
        raw.maxPlaySeconds,
        Number.isFinite(duration) ? duration : Number.NaN,
      );
      el.currentTime = playStartSeconds;
    };

    const onPlaying = () => {
      hasStartedPlayback.value = true;
      playState.value = PlayState.Playing;
      if (pendingPlayStartNotification.value) {
        pendingPlayStartNotification.value = false;
        props.onPlayStart?.();
      }
    };
    const onWaiting = () => {
      if (!el.paused) playState.value = PlayState.Loading;
    };
    // `timeupdate` fires a few times a second, which is all the readout needs;
    // a signal write here is the hook-free way to keep it current.
    const onTimeUpdate = () => {
      elapsedSeconds.value = el.currentTime;
    };

    el.addEventListener("playing", onPlaying);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("ended", resetPlaySession);
    el.addEventListener("error", resetPlaySession);

    return () => {
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("ended", resetPlaySession);
      el.removeEventListener("error", resetPlaySession);
    };
  });

  const listenSrc = buildListenSrc({
    id: props.audioId,
    playbackGainSourceSize: props.playbackGainSourceSize ?? null,
    playbackGainSourceMtimeMs: props.playbackGainSourceMtimeMs ?? null,
  });

  const play = () => {
    const el = audioRef.value;
    if (!el) return;
    props.onPlayRequested?.();
    if (props.lazyLoad && !el.getAttribute("src")) {
      el.src = listenSrc;
    }
    formPlaybackError.value = null;
    clearClipStopTimer();
    silenceGainNow();

    const rawTimings = clipTimingsFromFormOrFallback(
      props.syncPlaybackFromFormId,
      fallbackStartSig.value,
      fallbackMaxSig.value,
    );
    if (rawTimings.invalidForm) {
      formPlaybackError.value =
        "Fix playback start (≥ 0) and max length (≥ 2.5s) before previewing.";
      return;
    }

    playState.value = PlayState.Loading;
    pendingPlayStartNotification.value = true;

    void (async () => {
      try {
        const ctx = getSharedAudioContext();
        await ctx.resume();

        const duration = el.duration;
        const { playStartSeconds, maxPlaySeconds } = effectiveClipTimings(
          rawTimings.playStartSeconds,
          rawTimings.maxPlaySeconds,
          Number.isFinite(duration) ? duration : Number.NaN,
        );

        // Resuming after a pause continues where it left off; every other
        // start (and every quiz replay) rewinds to the clip start first.
        const resumePosition = el.currentTime;
        const isResuming = props.resumable === true &&
          resumePosition > playStartSeconds + 0.001 &&
          resumePosition < playStartSeconds + maxPlaySeconds;
        if (!isResuming) {
          await seekAudioTo(el, playStartSeconds);
        }

        const graph = ensureGraph(el);

        const targetLinear = targetLinearFromPlaybackGainDb(
          playbackGainSig.value,
        );

        const pos = isResuming ? resumePosition : playStartSeconds;

        const now = ctx.currentTime;
        const gainParam = graph.gainNode.gain;
        gainParam.cancelScheduledValues(now);
        /** Fade-in only when playback starts after t=0 (mid-file); from the top, go straight to level. */
        const useFadeIn = pos > 0.001;
        if (useFadeIn) {
          gainParam.setValueAtTime(0, now);
          gainParam.linearRampToValueAtTime(
            targetLinear,
            now + FADE_IN_SECONDS,
          );
        } else {
          gainParam.setValueAtTime(targetLinear, now);
        }

        const stopMediaTime = playStartSeconds + maxPlaySeconds;
        const fadeOutStartMedia = stopMediaTime - FADE_OUT_SECONDS;
        const delayFadeOutSeconds = Math.max(
          useFadeIn ? FADE_IN_SECONDS : 0,
          fadeOutStartMedia - pos,
        );
        const fadeOutStartCtx = now + delayFadeOutSeconds;
        gainParam.setValueAtTime(targetLinear, fadeOutStartCtx);
        gainParam.linearRampToValueAtTime(
          0,
          fadeOutStartCtx + FADE_OUT_SECONDS,
        );

        await el.play();

        const wallMs = Math.max(0, (stopMediaTime - pos) * 1000);
        clipStopTimerId.value = globalThis.setTimeout(() => {
          clipStopTimerId.value = undefined;
          el.pause();
          silenceGainNow();
          hasStartedPlayback.value = false;
          playState.value = PlayState.Idle;
          el.currentTime = playStartSeconds;
        }, wallMs) as unknown as number;
      } catch {
        clearClipStopTimer();
        pendingPlayStartNotification.value = false;
        hasStartedPlayback.value = false;
        playState.value = PlayState.Idle;
        silenceGainNow();
      }
    })();
  };

  /** Ends the session: rewinds to the clip start and clears the readout. */
  const stop = () => {
    const el = audioRef.value;
    if (!el) return;
    clearClipStopTimer();
    silenceGainNow();
    pendingPlayStartNotification.value = false;
    hasStartedPlayback.value = false;
    el.pause();
    const duration = el.duration;
    const raw = clipTimingsFromFormOrFallback(
      props.syncPlaybackFromFormId,
      fallbackStartSig.value,
      fallbackMaxSig.value,
    );
    const { playStartSeconds } = effectiveClipTimings(
      raw.playStartSeconds,
      raw.maxPlaySeconds,
      Number.isFinite(duration) ? duration : Number.NaN,
    );
    el.currentTime = playStartSeconds;
    elapsedSeconds.value = 0;
    playState.value = PlayState.Idle;
  };

  /**
   * Holds the session open where it stands. The position and the readout are
   * kept on purpose — they are what makes a resume mean anything, and what the
   * row shows while paused.
   */
  const pause = () => {
    const el = audioRef.value;
    if (!el) return;
    clearClipStopTimer();
    silenceGainNow();
    pendingPlayStartNotification.value = false;
    hasStartedPlayback.value = false;
    el.pause();
    playState.value = PlayState.Paused;
  };

  // Raw props are not reactive dependencies, so the id is bridged into a signal
  // before the effect reads it (see AGENTS.md, client reactivity).
  const activePlayerIdSig = useSignal(props.activePlayerId ?? null);
  activePlayerIdSig.value = props.activePlayerId ?? null;

  useSignalEffect(() => {
    const owner = activePlayerIdSig.value;
    if (owner === null || owner === props.audioId) return;
    if (playState.value === PlayState.Idle) return;
    stop();
  });

  const isPlaying = playState.value === PlayState.Playing;
  const isPaused = playState.value === PlayState.Paused;
  const offersPause = props.resumable === true;
  // The row control is a fixed circle rather than a padded pill. `p-0!` beats
  // the `p-4` that Button's pill shape applies, which plain `p-0` would not
  // reliably win against.
  const pad = props.row
    ? "h-10 w-10 p-0!"
    : props.compact
    ? "px-4 py-2"
    : "px-8";

  const audioElement = props.lazyLoad
    ? <audio ref={audioRef} preload="none" />
    : <audio ref={audioRef} src={listenSrc} preload="metadata" />;

  const showsPlayControl = playState.value === PlayState.Idle || isPaused ||
    (playState.value === PlayState.Loading && !loadingUiVisible.value);

  const controls = (
    <>
      {showsPlayControl && (
        <Button
          class={pad}
          variant="success"
          id={`listen-play-${props.audioId}`}
          disabled={props.disabled || playState.value === PlayState.Loading}
          onClick={play}
          aria-label={props.row
            ? `${isPaused ? "Resume" : "Play"} ${props.row.label}`
            : undefined}
        >
          <FaPlay />
        </Button>
      )}
      {playState.value === PlayState.Loading && loadingUiVisible.value && (
        <Button
          class={pad}
          variant="info"
          id={`listen-loading-${props.audioId}`}
          disabled
          aria-label={props.row ? `Loading ${props.row.label}` : undefined}
        >
          <SpinningIcon />
        </Button>
      )}
      {isPlaying && offersPause && (
        <Button
          class={pad}
          variant="warning"
          id={`listen-pause-${props.audioId}`}
          onClick={pause}
          aria-label={props.row ? `Pause ${props.row.label}` : undefined}
        >
          <FaPause />
        </Button>
      )}
      {(isPlaying || isPaused) && (
        <Button
          class={pad}
          variant="danger"
          id={`listen-stop-${props.audioId}`}
          onClick={stop}
          aria-label={props.row ? `Stop ${props.row.label}` : undefined}
        >
          <FaStop />
        </Button>
      )}
    </>
  );

  if (props.row) {
    /*
      The meter sits on the control line rather than under the title. That buys
      it the row's full height instead of a 14px sliver, and it leaves both
      label lines in place, so the card is the same height idle, playing and
      paused. `nm-protrude-sm` keeps the card's relief inside the list gap: at
      the full `.plateau` depth a card's shadow reaches into its neighbour's
      highlight, and the cards with no neighbour to wash them — the last of a
      letter run, one before a locked slot, the playing row — read heavier than
      the rest.
    */
    const showsMeter = isPlaying || isPaused;
    return (
      <div
        class={`plateau nm-protrude-sm flex items-center gap-3 rounded-[14px] py-2.5 pl-4 pr-3 ${
          isPlaying ? "glow glow-soft glow-green" : ""
        }`}
      >
        {audioElement}
        <div class="min-w-0 flex-1">
          {props.row.primary}
          {props.row.secondary}
        </div>
        {showsMeter && (
          <div class="flex shrink-0 items-center gap-1.5">
            {
              /*
              Resting bars and a frozen readout are how a paused row reports the
              position it kept; `active` drives the existing collapse tween.
            */
            }
            <AudioVisualizer
              enabled
              layout="inline"
              active={isPlaying}
              analyserNode={graphSig.value?.analyserNode ?? null}
            />
            {
              /*
              Below `xs` the row has to seat a title, the bars and two controls,
              and the bars are what request the space; the readout waits.
            */
            }
            <span class="hidden shrink-0 text-[10.5px] leading-none tabular-nums opacity-45 xs:block">
              {formatPlaybackTime(elapsedSeconds.value)}
            </span>
          </div>
        )}
        {controls}
      </div>
    );
  }

  return (
    <div class="flex flex-col gap-2 items-center">
      {formPlaybackError.value && (
        <p class="text-sm text-red-700 dark:text-red-300" role="alert">
          {formPlaybackError.value}
        </p>
      )}
      <div
        class={props.compact
          ? "flex flex-wrap gap-2 items-center justify-center"
          : "flex gap-3 py-2 items-center justify-center w-full"}
      >
        {audioElement}
        <AudioVisualizer
          enabled={!props.compact}
          active={isPlaying}
          analyserNode={graphSig.value?.analyserNode ?? null}
        >
          {controls}
        </AudioVisualizer>
      </div>
    </div>
  );
}
