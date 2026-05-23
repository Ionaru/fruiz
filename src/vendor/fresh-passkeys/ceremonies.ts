import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { decodeBase64Url, encodeBase64Url } from "@std/encoding/base64url";

import type { PasskeyStore, VerifiedRegistration } from "./types.ts";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

type AuthenticatorTransport = "usb" | "nfc" | "ble" | "internal" | "hybrid";

/** Inputs shared by every ceremony, supplied by the plugin from its config. */
export type CeremonyOptions = {
  rpId: string;
  rpName: string;
  store: PasskeyStore;
};

function toBase64Url(value: string | Uint8Array): string {
  return typeof value === "string" ? value : encodeBase64Url(value);
}

function parseTransports(
  raw: string | null,
): AuthenticatorTransport[] | undefined {
  if (!raw) return undefined;
  return JSON.parse(raw) as AuthenticatorTransport[];
}

export async function beginPublicRegistration(
  opts: CeremonyOptions,
  username: string,
): Promise<{ challengeId: string; options: unknown }> {
  const pendingUserId = crypto.randomUUID();
  const userName = username.trim();

  const options = await generateRegistrationOptions({
    rpName: opts.rpName,
    rpID: opts.rpId,
    userName,
    userDisplayName: userName,
    userID: new TextEncoder().encode(pendingUserId),
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },
    excludeCredentials: [],
  });

  const challengeId = crypto.randomUUID();
  await opts.store.putChallenge(challengeId, {
    challenge: options.challenge,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
    pendingUserId,
    username: userName,
  });
  return { challengeId, options };
}

export async function verifyPublicRegistration(
  opts: CeremonyOptions,
  challengeId: string,
  credential: unknown,
  expectedOrigin: string,
): Promise<VerifiedRegistration> {
  const entry = await opts.store.takeChallenge(challengeId);
  if (!entry?.pendingUserId || !entry.username) {
    throw new Error("Invalid challenge");
  }

  const verification = await verifyRegistrationResponse({
    response: credential as Parameters<
      typeof verifyRegistrationResponse
    >[0]["response"],
    expectedChallenge: entry.challenge,
    expectedOrigin,
    expectedRPID: opts.rpId,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Registration verification failed");
  }

  const cred = verification.registrationInfo.credential;
  return {
    pendingUserId: entry.pendingUserId,
    username: entry.username,
    credentialId: toBase64Url(cred.id),
    publicKey: toBase64Url(cred.publicKey),
    counter: cred.counter,
    transports: cred.transports ? JSON.stringify(cred.transports) : null,
  };
}

export async function beginAddPasskey(
  opts: CeremonyOptions,
  userId: string,
): Promise<{ challengeId: string; options: unknown }> {
  const username = await opts.store.getUsername(userId);
  if (!username) throw new Error("User not found");

  const existing = await opts.store.listPasskeys(userId);

  const options = await generateRegistrationOptions({
    rpName: opts.rpName,
    rpID: opts.rpId,
    userName: username,
    userDisplayName: username,
    userID: new TextEncoder().encode(userId),
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },
    excludeCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: parseTransports(c.transports),
    })),
  });

  const challengeId = crypto.randomUUID();
  await opts.store.putChallenge(challengeId, {
    challenge: options.challenge,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
    addPasskeyUserId: userId,
  });
  return { challengeId, options };
}

export async function verifyAddPasskey(
  opts: CeremonyOptions,
  challengeId: string,
  credential: unknown,
  expectedOrigin: string,
  expectedUserId: string,
): Promise<{ credentialId: string }> {
  const entry = await opts.store.takeChallenge(challengeId);
  if (!entry?.addPasskeyUserId || entry.addPasskeyUserId !== expectedUserId) {
    throw new Error("Invalid challenge");
  }

  const verification = await verifyRegistrationResponse({
    response: credential as Parameters<
      typeof verifyRegistrationResponse
    >[0]["response"],
    expectedChallenge: entry.challenge,
    expectedOrigin,
    expectedRPID: opts.rpId,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Registration verification failed");
  }

  const cred = verification.registrationInfo.credential;
  const credentialId = toBase64Url(cred.id);
  await opts.store.savePasskey({
    userId: expectedUserId,
    credentialId,
    publicKey: toBase64Url(cred.publicKey),
    counter: cred.counter,
    transports: cred.transports ? JSON.stringify(cred.transports) : null,
  });
  return { credentialId };
}

export async function beginAuthentication(
  opts: CeremonyOptions,
): Promise<{ challengeId: string; options: unknown }> {
  if (!(await opts.store.hasAnyPasskeys())) {
    throw new Error("No passkeys registered");
  }

  const options = await generateAuthenticationOptions({
    rpID: opts.rpId,
    userVerification: "preferred",
  });

  const challengeId = crypto.randomUUID();
  await opts.store.putChallenge(challengeId, {
    challenge: options.challenge,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  return { challengeId, options };
}

export async function finishAuthentication(
  opts: CeremonyOptions,
  challengeId: string,
  credential: unknown,
  expectedOrigin: string,
): Promise<{ userId: string }> {
  const entry = await opts.store.takeChallenge(challengeId);
  if (!entry) throw new Error("Invalid challenge");

  const credId = (credential as { id?: string }).id;
  if (!credId) throw new Error("Missing credential id");

  const stored = await opts.store.findPasskey(credId);
  if (!stored) throw new Error("Unknown credential");

  const verification = await verifyAuthenticationResponse({
    response: credential as Parameters<
      typeof verifyAuthenticationResponse
    >[0]["response"],
    expectedChallenge: entry.challenge,
    expectedOrigin,
    expectedRPID: opts.rpId,
    credential: {
      id: stored.credentialId,
      publicKey: decodeBase64Url(stored.publicKey),
      counter: stored.counter,
    },
  });

  if (!verification.verified) throw new Error("Auth verification failed");

  await opts.store.bumpCounter(
    stored.credentialId,
    verification.authenticationInfo.newCounter,
  );
  return { userId: stored.userId };
}
</content>
