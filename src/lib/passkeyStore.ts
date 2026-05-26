import { eq } from "drizzle-orm";

import { db } from "../db/db.ts";
import { passkeys } from "../db/schema.ts";
import type {
  ChallengeEntry,
  PasskeyStore,
  StoredPasskey,
} from "@ionaru/fresh-passkeys/server";

// In-memory challenge map: single-process only. A horizontally-scaled deploy
// must back this with a shared store (Redis or a `challenges` table) — see
// specs/90-roadmap.md. The adapter boundary makes that a drop-in swap.
const challenges = new Map<string, ChallengeEntry>();

type PasskeyRow = {
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports: string | null;
};

function toStored(row: PasskeyRow): StoredPasskey {
  return {
    userId: row.userId,
    credentialId: row.credentialId,
    publicKey: row.publicKey,
    counter: row.counter,
    transports: row.transports,
  };
}

/** Drizzle/SQLite implementation of the plugin's storage port. */
export class DrizzlePasskeyStore implements PasskeyStore {
  saveChallenge(id: string, entry: ChallengeEntry): void {
    challenges.set(id, entry);
  }

  takeChallenge(id: string): ChallengeEntry | null {
    const entry = challenges.get(id);
    if (!entry) return null;
    challenges.delete(id);
    if (Date.now() > entry.expiresAt) return null;
    return entry;
  }

  async findPasskey(credentialId: string): Promise<StoredPasskey | null> {
    const row = await db.query.passkeys.findFirst({
      where: { credentialId },
    });
    return row ? toStored(row) : null;
  }

  async listPasskeys(userId: string): Promise<StoredPasskey[]> {
    const rows = await db.query.passkeys.findMany({ where: { userId } });
    return rows.map(toStored);
  }

  async createPasskey(passkey: StoredPasskey): Promise<void> {
    await db.insert(passkeys).values({
      userId: passkey.userId,
      credentialId: passkey.credentialId,
      publicKey: passkey.publicKey,
      counter: passkey.counter,
      transports: passkey.transports,
      createdAt: new Date(),
    });
  }

  async setCounter(credentialId: string, counter: number): Promise<void> {
    await db
      .update(passkeys)
      .set({ counter })
      .where(eq(passkeys.credentialId, credentialId));
  }

  async hasAnyPasskeys(): Promise<boolean> {
    const rows = await db.query.passkeys.findMany({ limit: 1 });
    return rows.length > 0;
  }

  async findUsername(userId: string): Promise<string | null> {
    const user = await db.query.users.findFirst({ where: { id: userId } });
    return user?.username ?? null;
  }
}
