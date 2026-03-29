import { useSignal } from "@preact/signals";

const checkableClass =
  "h-4 w-4 shrink-0 accent-emerald-600 dark:accent-emerald-400";

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
  const selected = useSignal(props.initialDifficulty);

  return (
    <div class="space-y-1">
      <span class="text-sm font-medium">Difficulty</span>
      <div class="flex gap-3 pt-1">
        {(["easy", "hard"] as const).map((option) => (
          <label
            key={option}
            class="flex items-center gap-2 text-sm capitalize"
          >
            <input
              type="radio"
              name="difficulty"
              value={option}
              class={checkableClass}
              checked={selected.value === option}
              onInput={() => {
                selected.value = option;
              }}
            />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}
