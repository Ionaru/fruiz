import {
  type PublicKeyCredentialCreationOptionsJSON,
  startRegistration,
} from "@simplewebauthn/browser";
import { useSignal } from "@preact/signals";
import { Button } from "../components/Button.tsx";
import { FieldGroup } from "../components/ui/FieldGroup.tsx";
import { InlineAlert } from "../components/ui/InlineAlert.tsx";
import { PlateauCard } from "../components/ui/PlateauCard.tsx";
import { TextInput } from "../components/ui/TextInput.tsx";

export default function AccountRegistration() {
  const username = useSignal("");
  const status = useSignal("");

  const register = async () => {
    status.value = "";
    const name = username.value.trim();
    if (name.length < 3 || name.length > 24) {
      status.value = "Username must be between 3 and 24 characters.";
      return;
    }
    try {
      const optRes = await fetch(
        `/api/auth/register-public?username=${encodeURIComponent(name)}`,
      );
      if (!optRes.ok) {
        const err = await optRes.json().catch(() => ({})) as {
          error?: string;
        };
        status.value = err.error ??
          `Could not start registration (${optRes.status})`;
        return;
      }
      const { challengeId, options } = await optRes.json() as {
        challengeId: string;
        options: unknown;
      };
      const credential = await startRegistration({
        optionsJSON: options as PublicKeyCredentialCreationOptionsJSON,
      });
      const finishRes = await fetch("/api/auth/register-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ challengeId, username: name, credential }),
      });
      if (!finishRes.ok) {
        const err = await finishRes.json().catch(() => ({})) as {
          error?: string;
        };
        status.value = err.error ??
          `Registration failed (${finishRes.status})`;
        return;
      }
      globalThis.location.href = "/account";
    } catch (e) {
      status.value = e instanceof Error ? e.message : "Registration error";
    }
  };

  return (
    <PlateauCard class="space-y-6 max-w-md mx-auto">
      <h1 class="text-2xl font-semibold text-base-900 dark:text-base-100">
        Create account
      </h1>
      <p class="text-sm opacity-90 text-base-800 dark:text-base-100">
        Choose a username (3–24 characters) and register a passkey on this
        device.
      </p>
      <FieldGroup label="Username" htmlFor="reg-username">
        <TextInput
          id="reg-username"
          class="text-base min-h-11"
          value={username.value}
          onInput={(event) =>
            username.value = (event.currentTarget as HTMLInputElement).value}
          autocomplete="username"
        />
      </FieldGroup>
      <Button
        type="button"
        variant="success"
        class="w-full min-h-11"
        onClick={() => void register()}
      >
        Continue with passkey
      </Button>
      {status.value && (
        <InlineAlert variant="error" role="status">
          {status.value}
        </InlineAlert>
      )}
    </PlateauCard>
  );
}
