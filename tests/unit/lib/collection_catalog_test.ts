import { assert, assertEquals } from "@std/assert";
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
import { getCollectionCatalog } from "../../../src/lib/collections.ts";
import type { DB } from "../../../src/db/db.ts";

const PLAYER = "user-1";
const OTHER_PLAYER = "user-2";

/**
 * "Banjo-Kazooie" sits in two categories at once, which is what would fan out
 * into duplicate rows under a naive join. "Zzz Uncategorized" belongs to none,
 * so it must not appear at all. The rival player has collected everything.
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
    { id: "cat-games", name: "Video Games", slug: "video-games" },
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

  const seeded: { id: string; title: string; categoryIds: string[] }[] = [
    {
      id: "banjo",
      title: "Banjo-Kazooie",
      categoryIds: ["cat-nintendo", "cat-games"],
    },
    { id: "arma", title: "Arma 3", categoryIds: ["cat-games"] },
    { id: "switch", title: "1-2-Switch", categoryIds: ["cat-nintendo"] },
    { id: "orphan", title: "Zzz Uncategorized", categoryIds: [] },
  ];
  for (const track of seeded) {
    db.insert(tracks).values({
      id: track.id,
      title: track.title,
      audioUrl: `audio/${track.id}.mp3`,
      difficulty: "easy",
      playbackGainDb: -3,
    }).run();
    for (const categoryId of track.categoryIds) {
      db.insert(trackCategories).values({ trackId: track.id, categoryId })
        .run();
    }
  }

  db.insert(collectedTracks).values({
    userId: PLAYER,
    trackId: "arma",
    collectedAt: new Date(0),
  }).run();
  for (const track of seeded) {
    db.insert(collectedTracks).values({
      userId: OTHER_PLAYER,
      trackId: track.id,
      collectedAt: new Date(0),
    }).run();
  }

  return db;
}

Deno.test("getCollectionCatalog: a track in two categories is returned once", async () => {
  const catalog = await getCollectionCatalog(seedDb(), PLAYER);
  const banjo = catalog.filter((entry) => entry.trackId === "banjo");
  assertEquals(banjo.length, 1);
  assertEquals(banjo[0]?.categories.toSorted(), ["Nintendo", "Video Games"]);
});

Deno.test("getCollectionCatalog: uncategorized tracks are left out of the set", async () => {
  const catalog = await getCollectionCatalog(seedDb(), PLAYER);
  assert(
    !catalog.some((entry) => entry.trackId === "orphan"),
    "an uncategorized track would make the list disagree with the totals",
  );
  assertEquals(catalog.length, 3);
});

Deno.test("getCollectionCatalog: ordered by title, digits before letters", async () => {
  const catalog = await getCollectionCatalog(seedDb(), PLAYER);
  assertEquals(catalog.map((entry) => entry.title), [
    "1-2-Switch",
    "Arma 3",
    "Banjo-Kazooie",
  ]);
});

Deno.test("getCollectionCatalog: flags only what this player has collected", async () => {
  const catalog = await getCollectionCatalog(seedDb(), PLAYER);
  const collected = catalog.filter((entry) => entry.collected);
  assertEquals(collected.map((entry) => entry.title), ["Arma 3"]);
});

Deno.test("getCollectionCatalog: another player's collection does not leak in", async () => {
  const db = seedDb();
  const mine = await getCollectionCatalog(db, PLAYER);
  const theirs = await getCollectionCatalog(db, OTHER_PLAYER);
  assertEquals(mine.filter((entry) => entry.collected).length, 1);
  assertEquals(theirs.filter((entry) => entry.collected).length, 3);
});

Deno.test("getCollectionCatalog: carries the playback fields the row needs", async () => {
  const catalog = await getCollectionCatalog(seedDb(), PLAYER);
  const arma = catalog.find((entry) => entry.trackId === "arma");
  assertEquals(arma?.playbackGainDb, -3);
  assert(
    !Object.hasOwn(arma ?? {}, "audioUrl"),
    "audioUrl is never needed client-side; buildListenSrc derives it from the id",
  );
});
