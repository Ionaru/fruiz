import { useSignal } from "@preact/signals";
import { SelectInput } from "../components/ui/SelectInput.tsx";

export interface TrackAudioPickProps {
  id: string;
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
    <SelectInput
      id={props.id}
      name="audioUrl"
      required
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
    </SelectInput>
  );
}
