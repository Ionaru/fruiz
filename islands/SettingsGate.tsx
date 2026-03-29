import { Button } from "../components/Button.tsx";
import { FieldGroup } from "../components/ui/FieldGroup.tsx";
import { TextInput } from "../components/ui/TextInput.tsx";

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
      <FieldGroup label="Replay limit" htmlFor="replay-limit">
        <TextInput
          id="replay-limit"
          type="number"
          min={0}
          value={String(props.draftLimit)}
          onInput={(event) =>
            props.onDraftLimitInput(
              Number((event.currentTarget as HTMLInputElement).value),
            )}
        />
      </FieldGroup>
      <Button class="w-full" variant="success" onClick={props.onContinue}>
        Continue
      </Button>
    </div>
  );
}
