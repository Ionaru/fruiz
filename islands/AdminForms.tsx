import {
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { useSignal } from "@preact/signals";
import { Button } from "../components/Button.tsx";

/** Passkey sign-in and registration for `/admin/login`. */
export default function AdminForms() {
  const adminUserId = useSignal("");
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
      globalThis.location.href = "/admin";
    } catch (error) {
      status.value = error instanceof Error ? error.message : "Login error";
    }
  };

  const register = async () => {
    status.value = "";
    const adminRecordId = adminUserId.value.trim();
    if (!adminRecordId) {
      status.value = "Enter the admin user ID to attach this passkey to.";
      return;
    }
    try {
      const registerOptionsResponse = await fetch(
        `/api/auth/register?adminUserId=${encodeURIComponent(adminRecordId)}`,
      );
      if (!registerOptionsResponse.ok) {
        const errorBody = await registerOptionsResponse.json().catch(
          () => ({}),
        ) as { error?: string };
        status.value = errorBody.error ??
          `Register options failed (${registerOptionsResponse.status})`;
        return;
      }
      const { challengeId, options } = await registerOptionsResponse.json() as {
        challengeId: string;
        options: unknown;
      };
      const credential = await startRegistration({
        optionsJSON: options as PublicKeyCredentialCreationOptionsJSON,
      });
      const finishResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId,
          adminUserId: adminRecordId,
          credential,
        }),
      });
      if (!finishResponse.ok) {
        const errorBody = await finishResponse.json().catch(() => ({})) as {
          error?: string;
        };
        status.value = errorBody.error ??
          `Registration failed (${finishResponse.status})`;
        return;
      }
      status.value = "Passkey registered. You can sign in.";
    } catch (error) {
      status.value = error instanceof Error
        ? error.message
        : "Registration error";
    }
  };

  return (
    <div class="plateau rounded-2xl p-6 space-y-6 max-w-md mx-auto">
      <h1 class="text-2xl font-semibold">Admin</h1>
      <p class="text-sm opacity-90">
        Sign in with a registered passkey, or register a new passkey for an
        existing admin user ID.
      </p>
      <div class="space-y-2">
        <label class="text-sm font-medium" for="admin-user-id">
          Admin user ID (registration only)
        </label>
        <input
          id="admin-user-id"
          class="plateau rounded-xl px-3 py-2 w-full border-0 bg-transparent"
          value={adminUserId.value}
          onInput={(event) =>
            adminUserId.value = (event.currentTarget as HTMLInputElement).value}
          autocomplete="username"
        />
      </div>
      <div class="flex flex-col gap-3">
        <Button
          type="button"
          variant="success"
          class="w-full"
          onClick={() => void login()}
        >
          Sign in with passkey
        </Button>
        <Button
          type="button"
          variant="info"
          class="w-full"
          onClick={() => void register()}
        >
          Register passkey
        </Button>
      </div>
      {status.value && (
        <p class="text-sm text-red-800 dark:text-red-200" role="status">
          {status.value}
        </p>
      )}
    </div>
  );
}
