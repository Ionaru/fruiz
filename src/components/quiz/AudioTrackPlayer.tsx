import type { ComponentChildren } from "preact";
import { PlateauCard } from "../ui/PlateauCard.tsx";

export interface AudioTrackPlayerProps {
  /** 1-based index in the quiz order (never the real song title). */
  clipNumber: number;
  clipTotal: number;
  children?: ComponentChildren;
}

/** Quiz playback shell: does not reveal the answer title—only which clip slot is active. */
export function AudioTrackPlayer(props: Readonly<AudioTrackPlayerProps>) {
  return (
    <PlateauCard padding="4" class="space-y-3">
      <h3 class="text-lg font-semibold text-center">
        Clip {props.clipNumber} of {props.clipTotal}
      </h3>
      <p class="text-sm opacity-90 text-center">
        Listen, then type your guess below.
      </p>
      {props.children}
    </PlateauCard>
  );
}
