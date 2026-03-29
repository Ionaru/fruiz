import { effect, useSignal } from "@preact/signals";
import { useSignalRef } from "@preact/signals/utils";
import { Button } from "../components/Button.tsx";

export enum PlayState {
  Idle = "idle",
  Loading = "loading",
  Playing = "playing",
}

const LOADING_UI_DELAY_MS = 500;

interface AudioPlayerProps {
  audioId: string;
  /** When true, play is blocked until this becomes false. */
  disabled?: boolean;
  /** Called when audio actually starts (after user gesture). */
  onPlayStart?: () => void;
  /** Smaller controls for dense layouts (e.g. admin lists). */
  compact?: boolean;
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
    const id = globalThis.setTimeout(() => {
      if (playState.value === PlayState.Loading) {
        loadingUiVisible.value = true;
      }
    }, LOADING_UI_DELAY_MS);
    return () => globalThis.clearTimeout(id);
  });

  effect(() => {
    const el = audioRef.value;
    if (!el) return;

    const clearPendingPlayStart = () => {
      pendingPlayStartNotification.value = false;
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
    const resetPlaySession = () => {
      clearPendingPlayStart();
      hasStartedPlayback.value = false;
      playState.value = PlayState.Idle;
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
    playState.value = PlayState.Loading;
    pendingPlayStartNotification.value = true;
    el.play().catch(() => {
      pendingPlayStartNotification.value = false;
      hasStartedPlayback.value = false;
      playState.value = PlayState.Idle;
    });
  };

  const stop = () => {
    if (!audioRef.value) return;
    pendingPlayStartNotification.value = false;
    hasStartedPlayback.value = false;
    audioRef.value.pause();
    audioRef.value.currentTime = 0;
    playState.value = PlayState.Idle;
  };

  const pad = props.compact ? "px-4 py-2" : "px-8";
  return (
    <div
      class={props.compact
        ? "flex flex-wrap gap-2 items-center"
        : "flex flex-wrap gap-4 py-2 items-center"}
    >
      <audio
        ref={audioRef}
        src={`/api/listen/${props.audioId}`}
        preload="metadata"
      />
      {(playState.value === PlayState.Idle ||
        (playState.value === PlayState.Loading && !loadingUiVisible.value)) && (
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
  );
}
