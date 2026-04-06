import { useSignal } from "@preact/signals";

export interface TrackAudioPickProps {
  id: string;
  selectClass: string;
  initialAudioUrl: string;
  audioChoices: string[];
}

/**
 * Client island: `<select defaultValue>` can reset to the placeholder after
 * hydration on admin pages; a controlled select keeps the server value.
 */
export default function TrackAudioPick(props: Readonly<TrackAudioPickProps>) {
  const selected = useSignal(props.initialAudioUrl);

  return (
    <select
      id={props.id}
      name="audioUrl"
      required
      class={props.selectClass}
      value={selected.value}
      onInput={(ev) => {
        selected.value = (ev.currentTarget as HTMLSelectElement).value;
      }}
    >
      <option value="">Select audio file...</option>
      {props.audioChoices.map((path) => (
        <option key={path} value={path}>
          {path}
        </option>
      ))}
    </select>
  );
}
