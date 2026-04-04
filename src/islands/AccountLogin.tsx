import {
  type PublicKeyCredentialRequestOptionsJSON,
  startAuthentication,
} from "@simplewebauthn/browser";
import { useSignal } from "@preact/signals";
import { Button } from "../components/Button.tsx";
import { InlineAlert } from "../components/ui/InlineAlert.tsx";
import { PlateauCard } from "../components/ui/PlateauCard.tsx";

export default function AccountLogin() {
  const status = useSignal("");

  const login = async () => {
    status.value = "";
    try {
      const optionsResponse = await fetch("/api/auth/authenticate");
      if (!optionsResponse.ok) {
        const errorBody = await optionsResponse.json().catch(() => ({})) as {
          error?: string;
        };
        status.value = errorBody.error ??
          `Login failed (${optionsResponse.status})`;
        return;
      }
      const { challengeId, options } = await optionsResponse.json() as {
        challengeId: string;
        options: unknown;
      };
      const credential = await startAuthentication({
        optionsJSON: options as PublicKeyCredentialRequestOptionsJSON,
      });
      const verifyResponse = await fetch("/api/auth/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ challengeId, credential }),
      });
      if (!verifyResponse.ok) {
        const errorBody = await verifyResponse.json().catch(() => ({})) as {
          error?: string;
        };
        status.value = errorBody.error ??
          `Verify failed (${verifyResponse.status})`;
        return;
      }
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
