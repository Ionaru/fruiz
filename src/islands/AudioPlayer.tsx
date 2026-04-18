import { effect, useSignal, useSignalEffect } from "@preact/signals";
import { useSignalRef } from "@preact/signals/utils";
import { buildListenSrc } from "../lib/audioListenUrl.ts";

import { Button } from "../components/Button.tsx";
import {
  clampPlaybackGainDb,
  playbackGainDbToLinear,
} from "../lib/playbackGainMath.ts";
import {
  clampStartAndMaxToDuration,
  FADE_IN_SECONDS,
  FADE_OUT_SECONDS,
  parseTrackPlaybackFormFields,
  resolveMaxPlaySeconds,
  resolvePlayStartSeconds,
} from "../lib/quizPlayback.ts";

export enum PlayState {
  Idle = "idle",
  Loading = "loading",
  Playing = "playing",
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

  const playbackGainSig = useSignal(props.playbackGainDb ?? null);
  playbackGainSig.value = props.playbackGainDb ?? null;

  const fallbackStartSig = useSignal(props.playStartSeconds);
  const fallbackMaxSig = useSignal(props.maxPlaySeconds);
  fallbackStartSig.value = props.playStartSeconds;
  fallbackMaxSig.value = props.maxPlaySeconds;

  const formPlaybackError = useSignal<string | null>(null);

  const graphSig = useSignal<
    { gainNode: GainNode; el: HTMLMediaElement } | null
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
   * Keeps Web Audio graph wired; `MediaElementSource` is created once per element.
   */
  useSignalEffect(() => {
    const el = audioRef.value;
    if (!el) {
      graphSig.value = null;
      return;
    }

    const existing = graphSig.value;
    if (!existing || existing.el !== el) {
      const ctx = getSharedAudioContext();
      const source = ctx.createMediaElementSource(el);
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0;
      source.connect(gainNode).connect(ctx.destination);
      graphSig.value = { gainNode, el };
    } else if (playState.value === PlayState.Idle) {
      const linear = targetLinearFromPlaybackGainDb(playbackGainSig.value);
      existing.gainNode.gain.value = linear;
    }
  });

  effect(() => {
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

  effect(() => {
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

    el.addEventListener("playing", onPlaying);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("ended", resetPlaySession);
    el.addEventListener("error", resetPlaySession);

    return () => {
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("ended", resetPlaySession);
      el.removeEventListener("error", resetPlaySession);
    };
  });

  const play = () => {
    const el = audioRef.value;
    if (!el) return;
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

        await seekAudioTo(el, playStartSeconds);

        const graph = graphSig.value;
        if (!graph) {
          pendingPlayStartNotification.value = false;
          hasStartedPlayback.value = false;
          playState.value = PlayState.Idle;
          return;
        }

        const targetLinear = targetLinearFromPlaybackGainDb(
          playbackGainSig.value,
        );

        const now = ctx.currentTime;
        const gainParam = graph.gainNode.gain;
        gainParam.cancelScheduledValues(now);
        /** Fade-in only when playback starts after t=0 (mid-file); from the top, go straight to level. */
        const useFadeIn = playStartSeconds > 0.001;
        if (useFadeIn) {
          gainParam.setValueAtTime(0, now);
          gainParam.linearRampToValueAtTime(
            targetLinear,
            now + FADE_IN_SECONDS,
          );
        } else {
          gainParam.setValueAtTime(targetLinear, now);
        }

        const pos = playStartSeconds;
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

  const stop = () => {
    if (!audioRef.value) return;
    clearClipStopTimer();
    silenceGainNow();
    pendingPlayStartNotification.value = false;
    hasStartedPlayback.value = false;
    audioRef.value.pause();
    const duration = audioRef.value.duration;
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
    audioRef.value.currentTime = playStartSeconds;
    playState.value = PlayState.Idle;
  };

  const pad = props.compact ? "px-4 py-2" : "px-8";
  return (
    <div class="flex flex-col gap-2 items-center">
      {formPlaybackError.value && (
        <p class="text-sm text-red-700 dark:text-red-300" role="alert">
          {formPlaybackError.value}
        </p>
      )}
      <div
        class={props.compact
          ? "flex flex-wrap gap-2 items-center"
          : "flex flex-wrap gap-4 py-2 items-center"}
      >
        <audio
          ref={audioRef}
          src={buildListenSrc({
            id: props.audioId,
            playbackGainSourceSize: props.playbackGainSourceSize ?? null,
            playbackGainSourceMtimeMs: props.playbackGainSourceMtimeMs ?? null,
          })}
          preload="metadata"
        />
        {(playState.value === PlayState.Idle ||
          (playState.value === PlayState.Loading && !loadingUiVisible.value)) &&
          (
            <Button
              class={pad}
              variant="success"
              id={`listen-play-${props.audioId}`}
              disabled={props.disabled || playState.value === PlayState.Loading}
              onClick={play}
            >
              Play
            </Button>
          )}
        {playState.value === PlayState.Loading && loadingUiVisible.value && (
          <Button
            class={pad}
            variant="info"
            id={`listen-loading-${props.audioId}`}
            disabled
          >
            Loading...
          </Button>
        )}
        {playState.value === PlayState.Playing && (
          <Button
            class={pad}
            variant="danger"
            id={`listen-stop-${props.audioId}`}
            onClick={stop}
          >
            Stop
          </Button>
        )}
      </div>
    </div>
  );
}
