import { Button } from "../components/Button.tsx";

interface AudioPlayerProps {
  audioId: string;
}

export function AudioPlayer(props: AudioPlayerProps) {
  let audio: HTMLAudioElement | null = null;

  const play = () => {
    if (!audio) {
      audio = new Audio(`/api/listen/${props.audioId}`);
    }
    audio.play();
  }

  const stop = () => {
    audio?.pause();
  }

  return (
    <div class="flex gap-8 py-6">
      <Button id="play" onClick={play}>Play</Button>
      <Button id="stop" onClick={stop}>Stop</Button>
    </div>
  );
}
