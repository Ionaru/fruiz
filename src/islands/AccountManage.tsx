import { useSignal } from "@preact/signals";
import { AccountInfo } from "../components/account/AccountInfo.tsx";
import { Button } from "../components/Button.tsx";
import { InlineAlert } from "../components/ui/InlineAlert.tsx";
import { PlateauCard } from "../components/ui/PlateauCard.tsx";
import {
  addPasskey as addPasskeyRequest,
} from "../vendor/fresh-passkeys/client.ts";

type Props = { username: string; isAdmin?: boolean };

export default function AccountManage({ username, isAdmin }: Props) {
  const status = useSignal("");

  const addPasskey = async () => {
    status.value = "";
    try {
      await addPasskeyRequest();
      status.value = "Passkey added.";
    } catch (e) {
      status.value = e instanceof Error ? e.message : "Add passkey error";
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
    </PlateauCard>
  );
}
