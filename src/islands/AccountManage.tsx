import { useSignal } from "@preact/signals";
import { AccountInfo } from "../components/account/AccountInfo.tsx";
import { Button } from "../components/Button.tsx";
import { InlineAlert } from "../components/ui/InlineAlert.tsx";
import { PlateauCard } from "../components/ui/PlateauCard.tsx";
import { TextInput } from "../components/ui/TextInput.tsx";
import { passkeyClient, passkeyErrorMessage } from "../lib/passkeyClient.ts";

type Props = { username: string; isAdmin?: boolean };

const DELETE_CONFIRMATION = "DELETE";

export default function AccountManage({ username, isAdmin }: Props) {
  const status = useSignal("");
  const confirmText = useSignal("");

  const addPasskey = async () => {
    status.value = "";
    try {
      await passkeyClient.addPasskey();
      status.value = "Passkey added.";
    } catch (e) {
      status.value = passkeyErrorMessage(e, "Add passkey error");
    }
  };

  const logout = async () => {
    status.value = "";
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });
      if (!res.ok) {
        status.value = `Logout failed (${res.status})`;
        return;
      }
      globalThis.location.href = "/";
    } catch (e) {
      status.value = e instanceof Error ? e.message : "Logout error";
    }
  };

  const deleteAccount = async () => {
    status.value = "";
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });
      if (!res.ok) {
        status.value = `Delete failed (${res.status})`;
        return;
      }
      globalThis.location.href = "/";
    } catch (e) {
      status.value = e instanceof Error ? e.message : "Delete error";
    }
  };

  return (
    <PlateauCard class="space-y-6 max-w-md mx-auto">
      <AccountInfo username={username} isAdmin={isAdmin} />
      <div class="flex flex-col gap-3">
        <Button
          type="button"
          variant="info"
          class="w-full min-h-11"
          onClick={() => void addPasskey()}
        >
          Add another passkey
        </Button>
        <Button
          type="button"
          variant="danger"
          class="w-full min-h-11"
          onClick={() => void logout()}
        >
          Log out
        </Button>
      </div>
      {status.value && (
        <InlineAlert variant="neutral" role="status">
          {status.value}
        </InlineAlert>
      )}
      <div class="plateau w-full rounded-2xl p-5 space-y-3 border border-red-900/20">
        <p class="text-sm font-medium text-red-900 dark:text-red-200">
          Delete account
        </p>
        <p class="text-sm text-base-800 dark:text-base-100">
          This permanently removes your account, passkeys, and collected tracks.
          It cannot be undone.
        </p>
        <label class="block text-sm space-y-2">
          <span>
            Type <code>{DELETE_CONFIRMATION}</code> to confirm
          </span>
          <TextInput
            name="confirm"
            autocomplete="off"
            value={confirmText.value}
            onInput={(event) => confirmText.value = event.currentTarget.value}
          />
        </label>
        <Button
          type="button"
          variant="danger"
          class="w-full min-h-11"
          disabled={confirmText.value !== DELETE_CONFIRMATION}
          onClick={() => void deleteAccount()}
        >
          Delete account
        </Button>
      </div>
    </PlateauCard>
  );
}
