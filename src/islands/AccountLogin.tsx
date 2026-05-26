import { useSignal } from "@preact/signals";
import { Button } from "../components/Button.tsx";
import { InlineAlert } from "../components/ui/InlineAlert.tsx";
import { PlateauCard } from "../components/ui/PlateauCard.tsx";
import { passkeyClient, passkeyErrorMessage } from "../lib/passkeyClient.ts";

export default function AccountLogin() {
  const status = useSignal("");

  const login = async () => {
    status.value = "";
    try {
      await passkeyClient.login();
      globalThis.location.href = "/account";
    } catch (error) {
      status.value = passkeyErrorMessage(error, "Login error");
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
