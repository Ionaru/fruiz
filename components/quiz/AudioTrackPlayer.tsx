import type { ComponentChildren } from "preact";

export interface AudioTrackPlayerProps {
  /** 1-based index in the quiz order (never the real song title). */
  clipNumber: number;
  clipTotal: number;
  children?: ComponentChildren;
}

/** Quiz playback shell: does not reveal the answer title—only which clip slot is active. */
export function AudioTrackPlayer(props: Readonly<AudioTrackPlayerProps>) {
  return (
    <div class="plateau rounded-2xl p-4 space-y-3">
      <p class="text-sm opacity-80">Now playing</p>
      <h3 class="text-lg font-semibold">
        Clip {props.clipNumber} of {props.clipTotal}
      </h3>
      <p class="text-sm opacity-90">
        Listen, then type your guess below.
      </p>
      {props.children}
    </div>
  );
}
