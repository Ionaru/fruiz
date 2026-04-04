import { db } from "../db/db.ts";
import { passkeys, sessions, users } from "../db/schema.ts";
import type { VerifiedRegistration } from "./auth.ts";
import { SESSION_TTL_MS } from "./session.ts";

/** Transaction: `users` + `passkeys` + `sessions`; returns new session id for Set-Cookie. */
export function insertUserPasskeyAndSession(
  v: VerifiedRegistration,
): string {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const sessionId = crypto.randomUUID();

  db.transaction((tx) => {
    tx.insert(users).values({
      id: v.pendingUserId,
      username: v.username,
      admin: false,
      createdAt: now,
    }).run();
    tx.insert(passkeys).values({
      userId: v.pendingUserId,
      credentialId: v.credentialId,
      publicKey: v.publicKey,
      counter: v.counter,
      transports: v.transports,
      createdAt: now,
    }).run();
    tx.insert(sessions).values({
      id: sessionId,
      userId: v.pendingUserId,
      data: null,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    }).run();
  });

  return sessionId;
}
