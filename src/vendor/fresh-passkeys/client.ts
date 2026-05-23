// Browser entry: thin wrappers over `@simplewebauthn/browser` that drive the
// endpoints registered by `passkeyAuth`. Intentionally UI-free — the host app
// owns islands/markup/styling. Imports no server code, so it is island-safe.
import {
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";

const DEFAULT_BASE = "/api/auth";

type BeginResponse = { challengeId: string; options: unknown };

export type LoggedInUser = { id: string; username: string; admin: boolean };

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({})) as { error?: string };
  return body.error ?? `${fallback} (${res.status})`;
}

/** Register a new account + its first passkey. Throws on failure. */
export async function registerPasskey(
  username: string,
  basePath = DEFAULT_BASE,
): Promise<{ userId: string }> {
  const begin = await fetch(
    `${basePath}/register-public?username=${encodeURIComponent(username)}`,
  );
  if (!begin.ok) {
    throw new Error(await errorMessage(begin, "Could not start registration"));
  }
  const { challengeId, options } = await begin.json() as BeginResponse;
  const credential = await startRegistration({
    optionsJSON: options as PublicKeyCredentialCreationOptionsJSON,
  });
  const finish = await fetch(`${basePath}/register-public`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ challengeId, username, credential }),
  });
  if (!finish.ok) {
    throw new Error(await errorMessage(finish, "Registration failed"));
  }
  return await finish.json() as { userId: string };
}

/** Discoverable-credential login. Throws on failure. */
export async function loginPasskey(
  basePath = DEFAULT_BASE,
): Promise<{ user: LoggedInUser }> {
  const begin = await fetch(`${basePath}/authenticate`);
  if (!begin.ok) throw new Error(await errorMessage(begin, "Login failed"));
  const { challengeId, options } = await begin.json() as BeginResponse;
  const credential = await startAuthentication({
    optionsJSON: options as PublicKeyCredentialRequestOptionsJSON,
  });
  const finish = await fetch(`${basePath}/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ challengeId, credential }),
  });
  if (!finish.ok) throw new Error(await errorMessage(finish, "Verify failed"));
  return await finish.json() as { user: LoggedInUser };
}

/** Add another passkey to the signed-in account. Throws on failure. */
export async function addPasskey(
  basePath = DEFAULT_BASE,
): Promise<{ credentialId: string }> {
  const begin = await fetch(`${basePath}/register-add-passkey`, {
    credentials: "same-origin",
  });
  if (!begin.ok) throw new Error(await errorMessage(begin, "Could not start"));
  const { challengeId, options } = await begin.json() as BeginResponse;
  const credential = await startRegistration({
    optionsJSON: options as PublicKeyCredentialCreationOptionsJSON,
  });
  const finish = await fetch(`${basePath}/register-add-passkey`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ challengeId, credential }),
  });
  if (!finish.ok) {
    throw new Error(await errorMessage(finish, "Add passkey failed"));
  }
  return await finish.json() as { credentialId: string };
}
</content>
