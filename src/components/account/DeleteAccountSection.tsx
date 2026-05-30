import { Button } from "../Button.tsx";
import { PlateauCard } from "../ui/PlateauCard.tsx";

export interface DeleteAccountSectionProps {
  onRequestDelete: () => void;
}

/** Danger-zone card on `/account` that opens the delete-confirmation dialog. */
export function DeleteAccountSection(
  props: Readonly<DeleteAccountSectionProps>,
) {
  return (
    <PlateauCard variant="danger" padding="5" class="w-full space-y-3">
      <p class="text-sm font-medium text-red-900 dark:text-red-200">
        Delete account
      </p>
      <p class="text-sm text-base-800 dark:text-base-100">
        This permanently removes your account and collected tracks. It cannot be
        undone.
      </p>
      <Button
        type="button"
        variant="danger"
        class="w-full min-h-11"
        onClick={props.onRequestDelete}
      >
        Delete account
      </Button>
    </PlateauCard>
  );
}
