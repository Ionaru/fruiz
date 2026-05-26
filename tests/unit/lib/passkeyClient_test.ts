import { assertEquals } from "@std/assert";
import {
  passkeyErrorMessage,
  WebAuthnError,
} from "../../../src/lib/passkeyClient.ts";

const makeWebAuthnError = (code: string) =>
  new WebAuthnError({
    message: "raw technical message",
    // deno-lint-ignore no-explicit-any
    code: code as any,
    cause: new Error("NotAllowedError"),
  });

Deno.test("passkeyErrorMessage: cancelled prompt gets friendly copy", () => {
  const msg = passkeyErrorMessage(
    makeWebAuthnError("ERROR_CEREMONY_ABORTED"),
    "fallback",
  );
  assertEquals(
    msg,
    "Passkey prompt was cancelled or timed out. Please try again.",
  );
});

Deno.test("passkeyErrorMessage: already-registered passkey gets friendly copy", () => {
  const msg = passkeyErrorMessage(
    makeWebAuthnError("ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED"),
    "fallback",
  );
  assertEquals(msg, "This device already has a passkey for your account.");
});

Deno.test("passkeyErrorMessage: other WebAuthnError falls back to its message", () => {
  const msg = passkeyErrorMessage(
    makeWebAuthnError("ERROR_INVALID_RP_ID"),
    "fallback",
  );
  assertEquals(msg, "raw technical message");
});

Deno.test("passkeyErrorMessage: plain Error uses its message", () => {
  assertEquals(
    passkeyErrorMessage(new Error("server said no"), "fallback"),
    "server said no",
  );
});

Deno.test("passkeyErrorMessage: non-error value uses the fallback", () => {
  assertEquals(passkeyErrorMessage("oops", "fallback"), "fallback");
});
