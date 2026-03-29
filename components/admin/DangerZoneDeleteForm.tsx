import { Button } from "../Button.tsx";
import { TextInput } from "../ui/TextInput.tsx";

export interface DangerZoneDeleteFormProps {
  action: string;
  confirmInputId: string;
  submitLabel: string;
  disabled?: boolean;
  legend?: string;
}

export function DangerZoneDeleteForm(
  props: Readonly<DangerZoneDeleteFormProps>,
) {
  return (
    <form
      method="post"
      action={props.action}
      class="plateau w-full rounded-2xl p-5 space-y-3 border border-red-900/20"
    >
      <input type="hidden" name="intent" value="delete" />
      <p class="text-sm font-medium text-red-900 dark:text-red-200">
        {props.legend ?? "Danger zone"}
      </p>
      <label class="block text-sm space-y-2">
        <span>
          Type <code>DELETE</code> to confirm
        </span>
        <TextInput
          id={props.confirmInputId}
          name="confirm"
          autocomplete="off"
        />
      </label>
      <Button
        type="submit"
        variant="danger"
        class="w-full"
        disabled={props.disabled}
      >
        {props.submitLabel}
      </Button>
    </form>
  );
}
