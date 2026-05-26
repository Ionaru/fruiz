import {
  createPasskeyClient,
  WebAuthnError,
} from "@ionaru/fresh-passkeys/client";

// Single shared client for all account islands. Fruiz uses the default base
// path; a custom prefix would be configured here once.
export const passkeyClient = createPasskeyClient();

// Surface the passkey error type through the same module the islands already
// import, so they never reach into the plugin (or `@simplewebauthn`) directly.
export { WebAuthnError } from "@ionaru/fresh-passkeys/client";
export type { WebAuthnErrorCode } from "@ionaru/fresh-passkeys/client";

/**
 * Map a passkey failure to a user-facing string. A dismissed or timed-out OS
 * prompt is not a real error, so it gets friendly copy instead of the raw
 * `WebAuthnError.message`; everything else falls back to the error message.
 */
export function passkeyErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof WebAuthnError) {
    if (error.code === "ERROR_CEREMONY_ABORTED") {
      return "Passkey prompt was cancelled or timed out. Please try again.";
    }
    if (error.code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") {
      return "This device already has a passkey for your account.";
    }
  }
  return error instanceof Error ? error.message : fallback;
}
