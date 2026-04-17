import {
  type PublicKeyCredentialCreationOptionsJSON,
  startRegistration,
} from "@simplewebauthn/browser";
import { useSignal } from "@preact/signals";
import { Button } from "../components/Button.tsx";
import { InlineAlert } from "../components/ui/InlineAlert.tsx";
import { PlateauCard } from "../components/ui/PlateauCard.tsx";

type Props = { username: string; isAdmin?: boolean };

export default function AccountManage({ username, isAdmin }: Props) {
  const status = useSignal("");

  const addPasskey = async () => {
    status.value = "";
    try {
      const optRes = await fetch("/api/auth/register-add-passkey", {
        credentials: "same-origin",
      });
      if (!optRes.ok) {
        const err = await optRes.json().catch(() => ({})) as {
          error?: string;
        };
        status.value = err.error ?? `Could not start (${optRes.status})`;
        return;
      }
      const { challengeId, options } = await optRes.json() as {
        challengeId: string;
        options: unknown;
      };
      const credential = await startRegistration({
        optionsJSON: options as PublicKeyCredentialCreationOptionsJSON,
      });
      const finishRes = await fetch("/api/auth/register-add-passkey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ challengeId, credential }),
      });
      if (!finishRes.ok) {
        const err = await finishRes.json().catch(() => ({})) as {
          error?: string;
        };
        status.value = err.error ?? `Add passkey failed (${finishRes.status})`;
        return;
      }
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
      <h1 class="text-2xl font-semibold text-base-900 dark:text-base-100">
        Account
      </h1>
      <p class="text-sm opacity-90 text-base-800 dark:text-base-100">
        Signed in as <span class="font-medium">{username}</span>
      </p>
      {isAdmin && (
        <p
          class="rounded-xl px-3 py-2 text-sm bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100 border border-amber-800/15 dark:border-amber-200/20"
          role="status"
        >
          You are an admin.{" "}
          <a href="/admin" class="underline font-medium text-inherit">
            Admin pages
          </a>
        </p>
      )}
      <div class="flex flex-col gap-3">
        <a
          href="/collection"
          class="plateau rounded-xl px-4 py-3 text-center no-underline font-medium min-h-11 flex items-center justify-center text-base-900 dark:text-base-100"
        >
          My collection
        </a>
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
