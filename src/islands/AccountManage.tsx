import { useSignal, useSignalEffect } from "@preact/signals";
import { AccountInfo } from "../components/account/AccountInfo.tsx";
import { DeleteAccountDialogContent } from "../components/account/DeleteAccountDialogContent.tsx";
import { DeleteAccountSection } from "../components/account/DeleteAccountSection.tsx";
import { Button } from "../components/Button.tsx";
import { InlineAlert } from "../components/ui/InlineAlert.tsx";
import { PlateauCard } from "../components/ui/PlateauCard.tsx";
import { passkeyClient, passkeyErrorMessage } from "../lib/passkeyClient.ts";

type Props = { username: string; isAdmin?: boolean };

export default function AccountManage({ username, isAdmin }: Props) {
  const status = useSignal("");
  const confirmOpen = useSignal(false);
  const dialogRef = useSignal<HTMLDialogElement | null>(null);

  useSignalEffect(() => {
    const dialog = dialogRef.value;
    if (!dialog) return;
    if (confirmOpen.value && !dialog.open) {
      dialog.showModal();
    } else if (!confirmOpen.value && dialog.open) {
      dialog.close();
    }
  });

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
    confirmOpen.value = false;
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
      <DeleteAccountSection onRequestDelete={() => confirmOpen.value = true} />
      <dialog
        ref={(element) => {
          dialogRef.value = element;
        }}
        class="backdrop:bg-base-950/70 bg-transparent p-0 max-w-md w-[92vw] m-auto"
        onClose={() => confirmOpen.value = false}
      >
        <DeleteAccountDialogContent
          onConfirm={() => void deleteAccount()}
          onCancel={() => confirmOpen.value = false}
        />
      </dialog>
    </PlateauCard>
  );
}
