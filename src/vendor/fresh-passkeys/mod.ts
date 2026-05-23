// Server entry for the vendored passkey plugin. Islands import `./client.ts`
// directly so no server code leaks into client bundles.
export { passkeyAuth } from "./plugin.ts";
export type {
  ChallengeEntry,
  PasskeyConfig,
  PasskeyStore,
  StoredPasskey,
  VerifiedRegistration,
} from "./types.ts";
</content>
