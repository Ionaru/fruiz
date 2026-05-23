// Host-owned username policy. WebAuthn ceremonies, the challenge lifecycle and
// counter updates now live in the vendored passkey plugin
// (src/vendor/fresh-passkeys/), wired up via src/lib/passkeyConfig.ts.

/** Returns `null` if valid, otherwise a user-facing error message. */
export function validateUsername(username: string): string | null {
  const t = username.trim();
  if (t.length < 3 || t.length > 24) {
    return "Username must be between 3 and 24 characters.";
  }
  return null;
}
</content>
