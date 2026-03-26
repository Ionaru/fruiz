import { Button } from "../components/Button.tsx";

export interface SettingsGateProps {
  draftLimit: number;
  onDraftLimitInput: (value: number) => void;
  onContinue: () => void;
}

/** Pre-quiz replay limit; must live in `islands/` (client input + actions). */
export function SettingsGate(props: Readonly<SettingsGateProps>) {
  return (
    <div class="plateau rounded-2xl p-6 space-y-4">
      <h2 class="text-xl font-semibold">Before you start</h2>
      <p class="text-sm opacity-90">
        Choose how many times you can replay each clip (0 = unlimited).
      </p>
      <label class="block text-sm font-medium" for="replay-limit">
        Replay limit
      </label>
      <input
        id="replay-limit"
        type="number"
        min={0}
        class="plateau nm-dent-sm rounded-xl px-4 py-3 w-full border-0 bg-transparent"
        value={String(props.draftLimit)}
        onInput={(event) =>
          props.onDraftLimitInput(
            Number((event.currentTarget as HTMLInputElement).value),
          )}
      />
      <Button class="w-full" variant="success" onClick={props.onContinue}>
        Continue
      </Button>
    </div>
  );
}
