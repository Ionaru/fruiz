import { assertEquals } from "@std/assert";
import { drizzle } from "drizzle-orm/node-sqlite";
import { sql } from "drizzle-orm";

import { relations } from "../../../src/db/relations.ts";
import {
  categories,
  collectedTracks,
  trackCategories,
  tracks,
  users,
} from "../../../src/db/schema.ts";
import {
  getCollectedCountsBySlug,
  getCollectionStatsByCategory,
  getCollectionStatsForAllCategories,
} from "../../../src/lib/collections.ts";
import type { DB } from "../../../src/db/db.ts";

const PLAYER = "user-1";
const OTHER_PLAYER = "user-2";

/**
 * Two categories: "nintendo" holds three tracks, of which the player has
 * collected one, and "arcade" holds two the player has never collected from.
 * A second player collects everything, so leakage between accounts is visible.
 */
function seedDb(): DB {
  const db = drizzle(":memory:", { relations });

  db.run(sql`
    CREATE TABLE tracks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      audio_url TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      playback_gain_db REAL,
      playback_gain_source_size INTEGER,
      playback_gain_source_mtime_ms INTEGER,
      play_start_seconds REAL,
      max_play_seconds REAL,
      clip_playback_gain_db REAL,
      clip_playback_gain_start_seconds REAL,
      clip_playback_gain_max_seconds REAL
    )
  `);
  db.run(sql`
    CREATE TABLE categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE
    )
  `);
  db.run(sql`
    CREATE TABLE track_categories (
      track_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      PRIMARY KEY (track_id, category_id)
    )
  `);
  db.run(sql`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      admin INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `);
  db.run(sql`
    CREATE TABLE collected_tracks (
      user_id TEXT NOT NULL,
      track_id TEXT NOT NULL,
      collected_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, track_id)
    )
  `);

  db.insert(categories).values([
    { id: "cat-nintendo", name: "Nintendo", slug: "nintendo" },
    { id: "cat-arcade", name: "Arcade", slug: "arcade" },
  ]).run();

  db.insert(users).values([
    { id: PLAYER, username: "player", admin: false, createdAt: new Date(0) },
    {
      id: OTHER_PLAYER,
      username: "rival",
      admin: false,
      createdAt: new Date(0),
    },
  ]).run();

  const trackIds = ["nin-1", "nin-2", "nin-3", "arc-1", "arc-2"];
  for (const trackId of trackIds) {
    db.insert(tracks).values({
      id: trackId,
      title: trackId,
      audioUrl: `audio/${trackId}.mp3`,
      difficulty: "easy",
    }).run();
    db.insert(trackCategories).values({
      trackId,
      categoryId: trackId.startsWith("nin") ? "cat-nintendo" : "cat-arcade",
    }).run();
  }

  db.insert(collectedTracks).values({
    userId: PLAYER,
    trackId: "nin-1",
    collectedAt: new Date(0),
  }).run();
  for (const trackId of trackIds) {
    db.insert(collectedTracks).values({
      userId: OTHER_PLAYER,
      trackId,
      collectedAt: new Date(0),
    }).run();
  }

  return db;
}

function bySlug(
  rows: { categorySlug: string; collected: number; total: number }[],
): Record<string, { collected: number; total: number }> {
  const out: Record<string, { collected: number; total: number }> = {};
  for (const row of rows) {
    out[row.categorySlug] = { collected: row.collected, total: row.total };
  }
  return out;
}

Deno.test("getCollectionStatsForAllCategories: keeps categories the player has not started", async () => {
  const stats = bySlug(
    await getCollectionStatsForAllCategories(seedDb(), PLAYER),
  );
  assertEquals(stats, {
    nintendo: { collected: 1, total: 3 },
    arcade: { collected: 0, total: 2 },
  });
});

Deno.test("getCollectionStatsByCategory: still drops categories with nothing collected", async () => {
  const stats = bySlug(await getCollectionStatsByCategory(seedDb(), PLAYER));
  assertEquals(stats, { nintendo: { collected: 1, total: 3 } });
});

Deno.test("getCollectedCountsBySlug: every category is keyed, zeros included", async () => {
  assertEquals(await getCollectedCountsBySlug(seedDb(), PLAYER), {
    nintendo: 1,
    arcade: 0,
  });
});

Deno.test("getCollectedCountsBySlug: another player's collection does not leak in", async () => {
  const db = seedDb();
  assertEquals(await getCollectedCountsBySlug(db, OTHER_PLAYER), {
    nintendo: 3,
    arcade: 2,
  });
  assertEquals(await getCollectedCountsBySlug(db, PLAYER), {
    nintendo: 1,
    arcade: 0,
  });
});
