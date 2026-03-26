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
import { adminUsers, passkeys } from "../db/schema.ts";

export const ADMIN_SESSION_COOKIE = "fruiz_admin";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

type ChallengeEntry = {
  challenge: string;
  expiresAt: number;
  adminUserId?: string;
};

const challenges = new Map<string, ChallengeEntry>();

function getRpId(): string {
  return Deno.env.get("FRUIZ_RP_ID") ?? "localhost";
}

function getRpName(): string {
  return Deno.env.get("FRUIZ_RP_NAME") ?? "Musical Quiz";
}

function getSessionSecret(): string {
  return Deno.env.get("FRUIZ_SESSION_SECRET") ?? "dev-insecure-change-me";
}

function cookieSecure(): boolean {
  return Deno.env.get("FRUIZ_SECURE_COOKIES") === "1";
}

function encoder(): TextEncoder {
  return new TextEncoder();
}

async function hmacSign(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder().encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder().encode(message),
  );
  return encodeBase64Url(sig);
}

async function hmacVerify(message: string, sigB64: string): Promise<boolean> {
  const expected = await hmacSign(message);
  return timingSafeEqual(expected, sigB64);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export interface AdminSession {
  userId: string;
  username: string;
}

export async function createAdminSessionValue(
  userId: string,
  username: string,
): Promise<string> {
  const exp = Date.now() + 24 * 60 * 60 * 1000;
  const body = `${userId}|${username}|${exp}`;
  const sig = await hmacSign(body);
  return `${encodeBase64Url(encoder().encode(body))}.${sig}`;
}

export async function parseAdminSession(
  cookieValue: string | undefined,
): Promise<AdminSession | null> {
  if (!cookieValue) return null;
  const dot = cookieValue.lastIndexOf(".");
  if (dot <= 0) return null;
  const bodyB64 = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  try {
    const body = new TextDecoder().decode(decodeBase64Url(bodyB64));
    const ok = await hmacVerify(body, sig);
    if (!ok) return null;
    const [userId, username, expStr] = body.split("|");
    const exp = Number(expStr);
    if (!userId || !username || !Number.isFinite(exp) || Date.now() > exp) {
      return null;
    }
    return { userId, username };
  } catch {
    return null;
  }
}

export function sessionCookieHeader(
  value: string,
  maxAgeSec: number,
): string {
  const parts = [
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${maxAgeSec}`,
    "HttpOnly",
    "SameSite=Strict",
  ];
  if (cookieSecure()) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookieHeader(): string {
  const parts = [
    `${ADMIN_SESSION_COOKIE}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Strict",
  ];
  if (cookieSecure()) parts.push("Secure");
  return parts.join("; ");
}

export async function getSessionFromRequest(
  req: Request,
): Promise<AdminSession | null> {
  const cookie = req.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(
    new RegExp(`(?:^|;\\s*)${ADMIN_SESSION_COOKIE}=([^;]+)`),
  );
  const raw = match?.[1] ? decodeURIComponent(match[1]) : undefined;
  return await parseAdminSession(raw);
}

export function storeChallenge(
  id: string,
  challenge: string,
  adminUserId?: string,
): void {
  challenges.set(id, {
    challenge,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
    adminUserId,
  });
}

export function takeChallenge(id: string): ChallengeEntry | null {
  const e = challenges.get(id);
  if (!e) return null;
  challenges.delete(id);
  if (Date.now() > e.expiresAt) return null;
  return e;
}

export async function beginRegistration(
  adminUserId: string,
): Promise<{ challengeId: string; options: unknown }> {
  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, adminUserId))
    .limit(1);
  if (!user) throw new Error("Admin user not found");

  const existing = await db
    .select()
    .from(passkeys)
    .where(eq(passkeys.adminUserId, adminUserId));

  const options = await generateRegistrationOptions({
    rpName: getRpName(),
    rpID: getRpId(),
    userName: user.username,
    userDisplayName: user.username,
    userID: encoder().encode(user.id),
    attestationType: "none",
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
  storeChallenge(challengeId, options.challenge, adminUserId);
  return { challengeId, options };
}

export async function finishRegistration(
  challengeId: string,
  credential: unknown,
  expectedOrigin: string,
  options?: { expectedAdminUserId?: string },
): Promise<{ adminUserId: string; credentialId: string }> {
  const entry = takeChallenge(challengeId);
  if (!entry?.adminUserId) throw new Error("Invalid challenge");
  if (
    options?.expectedAdminUserId &&
    options.expectedAdminUserId !== entry.adminUserId
  ) {
    throw new Error("Admin mismatch");
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
    adminUserId: entry.adminUserId,
    credentialId,
    publicKey,
    counter: cred.counter,
    transports: cred.transports ? JSON.stringify(cred.transports) : null,
    createdAt: new Date(),
  });

  return { adminUserId: entry.adminUserId, credentialId };
}

export async function beginAuthentication(): Promise<
  { challengeId: string; options: unknown }
> {
  const creds = await db.select().from(passkeys);
  if (creds.length === 0) {
    throw new Error("No passkeys registered");
  }
  const options = await generateAuthenticationOptions({
    rpID: getRpId(),
    allowCredentials: creds.map((c) => ({
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
    userVerification: "preferred",
  });

  const challengeId = crypto.randomUUID();
  storeChallenge(challengeId, options.challenge);
  return { challengeId, options };
}

export async function finishAuthentication(
  challengeId: string,
  credential: unknown,
  expectedOrigin: string,
): Promise<AdminSession> {
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
    .from(adminUsers)
    .where(eq(adminUsers.id, row.adminUserId))
    .limit(1);
  if (!user) throw new Error("Admin missing");

  return { userId: user.id, username: user.username };
}
