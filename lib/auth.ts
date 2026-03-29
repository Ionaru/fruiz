import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import {
  decodeBase64Url,
  encodeBase64Url,
} from "jsr:@std/encoding@1/base64url";
import { eq } from "drizzle-orm";

import { db } from "../db/db.ts";
import { passkeys, users } from "../db/schema.ts";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

type ChallengeEntry = {
  challenge: string;
  expiresAt: number;
  /** Public registration: provisional user id (bytes sent to WebAuthn as user.id). */
  pendingUserId?: string;
  username?: string;
  /** Add passkey for logged-in user */
  addPasskeyUserId?: string;
};

const challenges = new Map<string, ChallengeEntry>();

function encoder(): TextEncoder {
  return new TextEncoder();
}

function getRpId(): string {
  return Deno.env.get("FRUIZ_RP_ID") ?? "localhost";
}

function getRpName(): string {
  return Deno.env.get("FRUIZ_RP_NAME") ?? "Musical Quiz";
}

export function storeChallenge(id: string, entry: ChallengeEntry): void {
  challenges.set(id, entry);
}

export function takeChallenge(id: string): ChallengeEntry | null {
  const e = challenges.get(id);
  if (!e) return null;
  challenges.delete(id);
  if (Date.now() > e.expiresAt) return null;
  return e;
}

/** Returns `null` if valid, otherwise a user-facing error message. */
export function validateUsername(username: string): string | null {
  const t = username.trim();
  if (t.length < 3 || t.length > 24) {
    return "Username must be between 3 and 24 characters.";
  }
  return null;
}

export async function beginPublicRegistration(
  username: string,
): Promise<{ challengeId: string; options: unknown }> {
  const err = validateUsername(username);
  if (err) throw new Error(err);

  const pendingUserId = crypto.randomUUID();
  const userName = username.trim();

  const options = await generateRegistrationOptions({
    rpName: getRpName(),
    rpID: getRpId(),
    userName,
    userDisplayName: userName,
    userID: encoder().encode(pendingUserId),
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },
    excludeCredentials: [],
  });

  const challengeId = crypto.randomUUID();
  storeChallenge(challengeId, {
    challenge: options.challenge,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
    pendingUserId,
    username: userName,
  });
  return { challengeId, options };
}

export async function beginAddPasskey(
  userId: string,
): Promise<{ challengeId: string; options: unknown }> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new Error("User not found");

  const existing = await db
    .select()
    .from(passkeys)
    .where(eq(passkeys.userId, userId));

  const options = await generateRegistrationOptions({
    rpName: getRpName(),
    rpID: getRpId(),
    userName: user.username,
    userDisplayName: user.username,
    userID: encoder().encode(user.id),
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },
    excludeCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: c.transports
        ? JSON.parse(c.transports) as (
          | "usb"
          | "nfc"
          | "ble"
          | "internal"
          | "hybrid"
        )[]
        : undefined,
    })),
  });

  const challengeId = crypto.randomUUID();
  storeChallenge(challengeId, {
    challenge: options.challenge,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
    addPasskeyUserId: userId,
  });
  return { challengeId, options };
}

export type VerifiedRegistration = {
  pendingUserId: string;
  username: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports: string | null;
};

/** Verifies registration and returns credential fields; does not touch the DB. */
export async function verifyPublicRegistration(
  challengeId: string,
  credential: unknown,
  expectedOrigin: string,
): Promise<VerifiedRegistration> {
  const entry = takeChallenge(challengeId);
  if (!entry?.pendingUserId || !entry.username) {
    throw new Error("Invalid challenge");
  }

  const verification = await verifyRegistrationResponse({
    response: credential as Parameters<
      typeof verifyRegistrationResponse
    >[0]["response"],
    expectedChallenge: entry.challenge,
    expectedOrigin,
    expectedRPID: getRpId(),
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Registration verification failed");
  }

  const info = verification.registrationInfo;
  const cred = info.credential;
  const credentialId = typeof cred.id === "string"
    ? cred.id
    : encodeBase64Url(cred.id);
  const publicKey = typeof cred.publicKey === "string"
    ? cred.publicKey
    : encodeBase64Url(cred.publicKey);

  return {
    pendingUserId: entry.pendingUserId,
    username: entry.username,
    credentialId,
    publicKey,
    counter: cred.counter,
    transports: cred.transports ? JSON.stringify(cred.transports) : null,
  };
}

export async function verifyAddPasskey(
  challengeId: string,
  credential: unknown,
  expectedOrigin: string,
  expectedUserId: string,
): Promise<{ credentialId: string }> {
  const entry = takeChallenge(challengeId);
  if (!entry?.addPasskeyUserId || entry.addPasskeyUserId !== expectedUserId) {
    throw new Error("Invalid challenge");
  }

  const verification = await verifyRegistrationResponse({
    response: credential as Parameters<
      typeof verifyRegistrationResponse
    >[0]["response"],
    expectedChallenge: entry.challenge,
    expectedOrigin,
    expectedRPID: getRpId(),
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Registration verification failed");
  }

  const info = verification.registrationInfo;
  const cred = info.credential;
  const credentialId = typeof cred.id === "string"
    ? cred.id
    : encodeBase64Url(cred.id);
  const publicKey = typeof cred.publicKey === "string"
    ? cred.publicKey
    : encodeBase64Url(cred.publicKey);

  await db.insert(passkeys).values({
    userId: expectedUserId,
    credentialId,
    publicKey,
    counter: cred.counter,
    transports: cred.transports ? JSON.stringify(cred.transports) : null,
    createdAt: new Date(),
  });

  return { credentialId };
}

export async function beginAuthentication(): Promise<
  { challengeId: string; options: unknown }
> {
  const anyPasskey = await db.select().from(passkeys).limit(1);
  if (anyPasskey.length === 0) {
    throw new Error("No passkeys registered");
  }

  const options = await generateAuthenticationOptions({
    rpID: getRpId(),
    userVerification: "preferred",
  });

  const challengeId = crypto.randomUUID();
  storeChallenge(challengeId, {
    challenge: options.challenge,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  return { challengeId, options };
}

export type AuthenticatedUser = {
  userId: string;
  username: string;
  admin: boolean;
};

export async function finishAuthentication(
  challengeId: string,
  credential: unknown,
  expectedOrigin: string,
): Promise<AuthenticatedUser> {
  const entry = takeChallenge(challengeId);
  if (!entry) throw new Error("Invalid challenge");

  const credId = (credential as { id?: string }).id;
  if (!credId) throw new Error("Missing credential id");

  const [row] = await db
    .select()
    .from(passkeys)
    .where(eq(passkeys.credentialId, credId))
    .limit(1);
  if (!row) throw new Error("Unknown credential");

  const verification = await verifyAuthenticationResponse({
    response: credential as Parameters<
      typeof verifyAuthenticationResponse
    >[0]["response"],
    expectedChallenge: entry.challenge,
    expectedOrigin,
    expectedRPID: getRpId(),
    credential: {
      id: row.credentialId,
      publicKey: decodeBase64Url(row.publicKey),
      counter: row.counter,
    },
  });

  if (!verification.verified) throw new Error("Auth verification failed");

  await db
    .update(passkeys)
    .set({ counter: verification.authenticationInfo.newCounter })
    .where(eq(passkeys.id, row.id));

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);
  if (!user) throw new Error("User missing");

  return {
    userId: user.id,
    username: user.username,
    admin: user.admin,
  };
}
