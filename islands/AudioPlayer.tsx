import { effect, signal, useSignal } from "@preact/signals";
import { useSignalRef } from '@preact/signals/utils';
import { Button } from "../components/Button.tsx";

interface AudioPlayerProps {
  audioId: string;
  /** When true, play is blocked until this becomes false. */
  disabled?: boolean;
  /** Called when audio actually starts (after user gesture). */
  onPlayStart?: () => void;
  /** Smaller controls for dense layouts (e.g. admin lists). */
  compact?: boolean;
}

export function createIsPlayingSignal(audio: HTMLAudioElement) {
  const isPlaying = signal(false);

  const update = () => {
    isPlaying.value =
      !audio.paused &&
      !audio.ended &&
      audio.readyState > 2;
  };

  // Core playback events
  audio.addEventListener('play', update);
  audio.addEventListener('pause', update);
  audio.addEventListener('ended', update);

  // More precise “actually playing” signals
  audio.addEventListener('playing', update);
  audio.addEventListener('waiting', update);
  audio.addEventListener('seeking', update);

  // Initial state sync
  update();

  // Optional cleanup
  const dispose = () => {
    audio.removeEventListener('play', update);
    audio.removeEventListener('pause', update);
    audio.removeEventListener('ended', update);
    audio.removeEventListener('playing', update);
    audio.removeEventListener('waiting', update);
    audio.removeEventListener('seeking', update);
  };

  return { isPlaying, dispose };
}

export function AudioPlayer(props: Readonly<AudioPlayerProps>) {
  const audioRef = useSignalRef<HTMLAudioElement | null>(null);
  const audioPlaying = useSignal(false);

  effect(() => {
    if (!audioRef.value) return;
    const { isPlaying, dispose } = createIsPlayingSignal(audioRef.value);
    audioPlaying.value = isPlaying.value;
    return dispose;
  });

  const play = () => {
    audioRef.value?.play();
  };

  const stop = () => {
    if (!audioRef.value) return;
    audioRef.value.pause();
    audioRef.value.currentTime = 0;
  };

  const pad = props.compact ? "px-4 py-2" : "px-8";
  return (
    <div
      class={
        props.compact
          ? "flex flex-wrap gap-2 items-center"
          : "flex flex-wrap gap-4 py-2 items-center"
      }
    >
      <audio ref={audioRef} src={`/api/listen/${props.audioId}`} preload="metadata" />
      {!audioPlaying.value && (
        <Button
          class={pad}
          variant="success"
          id={`listen-play-${props.audioId}`}
          disabled={props.disabled}
          onClick={play}
        >
          Play
        </Button>
      )}
      {audioPlaying.value && (
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
