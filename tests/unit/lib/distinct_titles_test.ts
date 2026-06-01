import { assertEquals } from "@std/assert";
import { drizzle } from "drizzle-orm/node-sqlite";
import { sql } from "drizzle-orm";

import { relations } from "../../../src/db/relations.ts";
import { categories, trackCategories, tracks } from "../../../src/db/schema.ts";
import { getDistinctTitlesForCategory } from "../../../src/lib/categories.ts";
import type { DB } from "../../../src/db/db.ts";

/**
 * Build an in-memory SQLite DB with just the tables that
 * `getDistinctTitlesForCategory` touches, seeded with a category that holds a
 * mix of easy and hard tracks.
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

  db.insert(categories).values({ id: "cat-1", name: "Cat", slug: "cat" }).run();
  const rows = [
    { id: "t-easy-1", title: "Easy One", difficulty: "easy" as const },
    { id: "t-easy-2", title: "Easy Two", difficulty: "easy" as const },
    { id: "t-hard-1", title: "Hard One", difficulty: "hard" as const },
  ];
  for (const r of rows) {
    db.insert(tracks).values({
      id: r.id,
      title: r.title,
      audioUrl: `audio/${r.id}.mp3`,
      difficulty: r.difficulty,
    }).run();
    db.insert(trackCategories).values({
      trackId: r.id,
      categoryId: "cat-1",
    }).run();
  }

  return db;
}

Deno.test('getDistinctTitlesForCategory: "easy" returns only easy titles', async () => {
  const db = seedDb();
  assertEquals(
    await getDistinctTitlesForCategory(db, "cat-1", "easy"),
    ["Easy One", "Easy Two"],
  );
});

Deno.test("getDistinctTitlesForCategory: hard/omitted return full pool", async () => {
  const db = seedDb();
  const full = ["Easy One", "Easy Two", "Hard One"];
  assertEquals(await getDistinctTitlesForCategory(db, "cat-1", "hard"), full);
  assertEquals(await getDistinctTitlesForCategory(db, "cat-1"), full);
});
