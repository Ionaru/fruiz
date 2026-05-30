import { assertEquals } from "@std/assert";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";

import { relations } from "../../../src/db/relations.ts";
import {
  collectedTracks,
  passkeys,
  sessions,
  users,
} from "../../../src/db/schema.ts";
import { deleteUserAccount } from "../../../src/lib/deleteAccount.ts";

/**
 * Builds an in-memory database with the minimal schema needed to exercise the
 * cascade from `users` to its dependent tables. SQLite enforces foreign keys
 * (and therefore `ON DELETE CASCADE`) only when the pragma is on; `node:sqlite`
 * enables it by default, but we set it explicitly so the test documents the
 * invariant it relies on.
 */
function createSeededDb() {
  const client = new DatabaseSync(":memory:");
  client.exec("PRAGMA foreign_keys = ON");
  client.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      admin INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE tracks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      audio_url TEXT NOT NULL,
      difficulty TEXT NOT NULL
    );
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      data TEXT,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER
    );
    CREATE TABLE passkeys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_id TEXT NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      counter INTEGER NOT NULL DEFAULT 0,
      transports TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE collected_tracks (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
      collected_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, track_id)
    );
  `);
  const db = drizzle({ client, relations });
  return { client, db };
}

function countRows(client: DatabaseSync, table: string): number {
  const row = client.prepare(`SELECT COUNT(*) AS count FROM ${table}`)
    .get() as {
      count: number;
    };
  return row.count;
}

Deno.test("deleteUserAccount cascades to passkeys, sessions, and collected tracks", async () => {
  const { client, db } = createSeededDb();
  const now = new Date();
  const userId = "user-1";
  const trackId = "track-1";

  await db.insert(users).values({
    id: userId,
    username: "player",
    admin: false,
    createdAt: now,
  });
  // Seeded via the raw client: the track only exists to satisfy the
  // collected_tracks FK, and the minimal table here omits columns the full
  // Drizzle `tracks` insert would expect.
  client
    .prepare(
      "INSERT INTO tracks (id, title, audio_url, difficulty) VALUES (?, ?, ?, ?)",
    )
    .run(trackId, "Song", "https://example.test/song.mp3", "easy");
  await db.insert(sessions).values({
    id: "session-1",
    userId,
    data: null,
    expiresAt: new Date(now.getTime() + 60_000),
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(passkeys).values({
    userId,
    credentialId: "cred-1",
    publicKey: "pub",
    counter: 0,
    transports: null,
    createdAt: now,
  });
  await db.insert(collectedTracks).values({
    userId,
    trackId,
    collectedAt: now,
  });

  await deleteUserAccount(userId, db);

  assertEquals(countRows(client, "users"), 0);
  assertEquals(countRows(client, "sessions"), 0);
  assertEquals(countRows(client, "passkeys"), 0);
  assertEquals(countRows(client, "collected_tracks"), 0);

  // The track itself is unrelated to the account and must survive.
  assertEquals(countRows(client, "tracks"), 1);
});
