import { useSignal } from "@preact/signals";
import { Button } from "../components/Button.tsx";

interface AudioPlayerProps {
  audioId: string;
}

export function AudioPlayer(props: Readonly<AudioPlayerProps>) {
  const audio = useSignal<HTMLAudioElement | null>(null);

  const play = () => {
    if (!audio.value) {
      audio.value = new Audio(`/api/listen/${props.audioId}`);
      audio.value.play();
    }
  }

  const stop = () => {
    audio.value?.pause();
    audio.value = null;
  }

  return (
    <div class="flex gap-8 py-6 items-center">
      {!audio.value && <Button class="px-16" variant="success" id="play" onClick={play}>Play</Button>}
      {audio.value && <Button class="px-16" variant="danger" id="stop" onClick={stop}>Stop</Button>}
    </div>
  );
}
