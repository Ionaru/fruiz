import { useSignal } from "@preact/signals";
import { Button } from "../components/Button.tsx";
import { InlineAlert } from "../components/ui/InlineAlert.tsx";
import { PlateauCard } from "../components/ui/PlateauCard.tsx";
import { loginPasskey } from "../vendor/fresh-passkeys/client.ts";

export default function AccountLogin() {
  const status = useSignal("");

  const login = async () => {
    status.value = "";
    try {
      await loginPasskey();
      globalThis.location.href = "/account";
    } catch (error) {
      status.value = error instanceof Error ? error.message : "Login error";
    }
  };

  return (
    <PlateauCard class="space-y-6 max-w-md mx-auto">
      <h1 class="text-2xl font-semibold text-base-900 dark:text-base-100">
        Sign in
      </h1>
      <p class="text-sm opacity-90 text-base-800 dark:text-base-100">
        Use your device passkey (no username needed).
      </p>
      <Button
        type="button"
        variant="success"
        class="w-full min-h-11"
        onClick={() => void login()}
      >
        Sign in with passkey
      </Button>
      {status.value && (
        <InlineAlert variant="error" role="status">
          {status.value}
        </InlineAlert>
      )}
    </PlateauCard>
  );
}
