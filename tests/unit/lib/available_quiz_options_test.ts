import { assertEquals, assertExists } from "@std/assert";
import { drizzle } from "drizzle-orm/node-sqlite";
import { sql } from "drizzle-orm";

import { relations } from "../../../src/db/relations.ts";
import { categories, trackCategories, tracks } from "../../../src/db/schema.ts";
import { getAvailableQuizOptions } from "../../../src/lib/categories.ts";
import type { DB } from "../../../src/db/db.ts";

/**
 * In-memory SQLite seeded with one category holding `easyCount` easy tracks and
 * `hardCount` hard tracks. The "easy" difficulty draws from the easy pool only;
 * "hard" draws from the whole pool (easy + hard).
 */
function seedDb(easyCount: number, hardCount: number): DB {
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

  db.insert(categories).values({ id: "cat-1", name: "Cat", slug: "cat" }).run();

  const insert = (id: string, difficulty: "easy" | "hard") => {
    db.insert(tracks).values({
      id,
      title: id,
      audioUrl: `audio/${id}.mp3`,
      difficulty,
    }).run();
    db.insert(trackCategories).values({ trackId: id, categoryId: "cat-1" })
      .run();
  };

  for (let i = 0; i < easyCount; i++) insert(`easy-${i}`, "easy");
  for (let i = 0; i < hardCount; i++) insert(`hard-${i}`, "hard");

  return db;
}

Deno.test("getAvailableQuizOptions: reports per-difficulty track counts", async () => {
  // 25 easy + 10 hard → easy pool = 25, hard pool (all) = 35; both >= MIN_TRACKS.
  const db = seedDb(25, 10);
  const options = await getAvailableQuizOptions(db);

  assertEquals(options.length, 1);
  assertExists(options[0]);
  assertEquals(options[0].difficulties, [
    { mode: "easy", trackCount: 25 },
    { mode: "hard", trackCount: 35 },
  ]);
});

Deno.test("getAvailableQuizOptions: omits a difficulty below MIN_TRACKS", async () => {
  // 5 easy + 20 hard → easy pool = 5 (excluded), hard pool = 25 (included).
  const db = seedDb(5, 20);
  const options = await getAvailableQuizOptions(db);

  assertEquals(options.length, 1);
  assertExists(options[0]);
  assertEquals(options[0].difficulties, [{ mode: "hard", trackCount: 25 }]);
});
