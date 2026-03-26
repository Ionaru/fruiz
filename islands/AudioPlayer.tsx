import { useSignal } from "@preact/signals";
import { Button } from "../components/Button.tsx";

interface AudioPlayerProps {
  audioId: string;
  /** When true, play is blocked until this becomes false. */
  disabled?: boolean;
  /** Called when audio actually starts (after user gesture). */
  onPlayStart?: () => void;
}

export function AudioPlayer(props: Readonly<AudioPlayerProps>) {
  const audio = useSignal<HTMLAudioElement | null>(null);

  const play = () => {
    if (props.disabled) return;
    if (audio.value) {
      props.onPlayStart?.();
      void audio.value.play();
    } else {
      audio.value = new Audio(`/api/listen/${props.audioId}`);
      audio.value.addEventListener("play", () => props.onPlayStart?.(), {
        once: true,
      });
      void audio.value.play();
    }
  };

  const stop = () => {
    audio.value?.pause();
    audio.value = null;
  };

  return (
    <div class="flex flex-wrap gap-4 py-2 items-center">
      {!audio.value && (
        <Button
          class="px-8"
          variant="success"
          id="play"
          disabled={props.disabled}
          onClick={play}
        >
          Play
        </Button>
      )}
      {audio.value && (
        <Button class="px-8" variant="danger" id="stop" onClick={stop}>
          Stop
        </Button>
      )}
    </div>
  );
}
