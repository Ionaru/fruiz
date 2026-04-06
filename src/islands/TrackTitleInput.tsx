import { useSignal } from "@preact/signals";
import { TextInput } from "../components/ui/TextInput.tsx";

export interface TrackTitleInputProps {
  id: string;
  inputClass: string;
  initialTitle: string;
}

/**
 * Client island: keeps title in sync after hydration (same rationale as
 * `TrackDifficultyPick` / `TrackAudioPick` on admin pages).
 */
export default function TrackTitleInput(props: Readonly<TrackTitleInputProps>) {
  const title = useSignal(props.initialTitle);

  return (
    <TextInput
      id={props.id}
      name="title"
      type="text"
      required
      class={props.inputClass}
      value={title.value}
      onInput={(ev) => {
        title.value = (ev.currentTarget as HTMLInputElement).value;
      }}
    />
  );
}
