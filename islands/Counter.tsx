import type { Signal } from "@preact/signals";
import { Button } from "../components/Button.tsx";

interface CounterProps {
  count: Signal<number>;
}

const play = () => {
  const audio = new Audio("/api/listen");
  audio.play();
}

const stop = () => {
  const audio = new Audio("/api/listen");
  audio.pause();
}

export default function Counter(props: CounterProps) {
  return (
    <div class="flex gap-8 py-6">
      <Button id="decrement" onClick={() => props.count.value -= 1}>-1</Button>
      <p class="text-3xl tabular-nums">{props.count}</p>
      <Button id="increment" onClick={() => props.count.value += 1}>+1</Button>
      <Button id="play" onClick={play}>Play</Button>
      <Button id="stop" onClick={stop}>Stop</Button>
    </div>
  );
}
