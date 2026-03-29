import {
  type PublicKeyCredentialCreationOptionsJSON,
  startRegistration,
} from "@simplewebauthn/browser";
import { useSignal } from "@preact/signals";
import { Button } from "../components/Button.tsx";

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
    <div class="plateau rounded-2xl p-6 space-y-6 max-w-md mx-auto">
      <h1 class="text-2xl font-semibold text-base-900 dark:text-base-100">
        Create account
      </h1>
      <p class="text-sm opacity-90 text-base-800 dark:text-base-100">
        Choose a username (3–24 characters) and register a passkey on this
        device.
      </p>
      <div class="space-y-2">
        <label class="text-sm font-medium" for="reg-username">
          Username
        </label>
        <input
          id="reg-username"
          class="plateau nm-dent-sm rounded-xl px-4 py-3 w-full border-0 bg-transparent text-base min-h-11 text-base-900 dark:text-base-100"
          value={username.value}
          onInput={(event) =>
            username.value = (event.currentTarget as HTMLInputElement).value}
          autocomplete="username"
        />
      </div>
      <Button
        type="button"
        variant="success"
        class="w-full min-h-11"
        onClick={() => void register()}
      >
        Continue with passkey
      </Button>
      {status.value && (
        <p class="text-sm text-red-800 dark:text-red-200" role="status">
          {status.value}
        </p>
      )}
    </div>
  );
}
