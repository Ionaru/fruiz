import { Button } from "../Button.tsx";
import { PlateauCard } from "../ui/PlateauCard.tsx";

export interface DeleteAccountDialogContentProps {
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation body rendered inside the delete-account modal `<dialog>`. */
export function DeleteAccountDialogContent(
  props: Readonly<DeleteAccountDialogContentProps>,
) {
  return (
    <PlateauCard variant="danger" class="space-y-4">
      <h2 class="text-lg font-semibold text-red-900 dark:text-red-200">
        Delete your account?
      </h2>
      <p class="text-sm text-base-800 dark:text-base-100">
        This permanently removes your account and collected tracks. It cannot be
        undone.
      </p>
      <p class="text-sm text-base-800 dark:text-base-100">
        Your passkeys live on your own devices, not on fruiz. Deleting your
        account does not remove them — you'll need to delete the fruiz passkey
        from each device and password manager yourself.
      </p>
      <div class="flex flex-col gap-3">
        <Button
          type="button"
          variant="danger"
          class="w-full min-h-11"
          onClick={props.onConfirm}
        >
          Delete account
        </Button>
        <Button
          type="button"
          class="w-full min-h-11"
          onClick={props.onCancel}
        >
          Cancel
        </Button>
      </div>
    </PlateauCard>
  );
}
