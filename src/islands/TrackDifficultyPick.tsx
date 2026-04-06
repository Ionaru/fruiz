import RadioGroupField from "./RadioGroupField.tsx";

export interface TrackDifficultyPickProps {
  initialDifficulty: "easy" | "hard";
}

/**
 * Client island: radio `defaultChecked` is unreliable when the admin page tree
 * is hydrated; controlled radios keep the server-provided value and stay editable.
 */
export default function TrackDifficultyPick(
  props: Readonly<TrackDifficultyPickProps>,
) {
  return (
    <RadioGroupField
      legend="Difficulty"
      name="difficulty"
      options={[
        { value: "easy", label: "easy" },
        { value: "hard", label: "hard" },
      ]}
      initialValue={props.initialDifficulty}
      class="space-y-1"
      optionsClass="flex gap-3 pt-1"
    />
  );
}
