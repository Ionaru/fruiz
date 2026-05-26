import { useSignal } from "@preact/signals";
import { Button } from "../components/Button.tsx";
import { FieldGroup } from "../components/ui/FieldGroup.tsx";
import { InlineAlert } from "../components/ui/InlineAlert.tsx";
import { PlateauCard } from "../components/ui/PlateauCard.tsx";
import { TextInput } from "../components/ui/TextInput.tsx";
import { passkeyClient, passkeyErrorMessage } from "../lib/passkeyClient.ts";

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
      await passkeyClient.register(name);
      globalThis.location.href = "/account";
    } catch (e) {
      status.value = passkeyErrorMessage(e, "Registration error");
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
