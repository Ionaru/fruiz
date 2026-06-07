import { assert, assertEquals } from "@std/assert";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";

import { relations } from "../../../src/db/relations.ts";
import { getTrackTitlesWithDifficultyForCategory } from "../../../src/lib/categories.ts";

/**
 * In-memory database with just the tables the tracks endpoint touches:
 * `categories`, `tracks`, and the `track_categories` junction.
 */
function createSeededDb() {
  const client = new DatabaseSync(":memory:");
  client.exec("PRAGMA foreign_keys = ON");
  client.exec(`
    CREATE TABLE categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE
    );
    CREATE TABLE tracks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      audio_url TEXT NOT NULL,
      difficulty TEXT NOT NULL
    );
    CREATE TABLE track_categories (
      track_id TEXT NOT NULL REFERENCES tracks(id),
      category_id TEXT NOT NULL REFERENCES categories(id),
      PRIMARY KEY (track_id, category_id)
    );
  `);
  const db = drizzle({ client, relations });
  return { client, db };
}

Deno.test("category tracks expose a filename without path or extension", async () => {
  const { client, db } = createSeededDb();
  const categoryId = "cat-1";

  client
    .prepare("INSERT INTO categories (id, name, slug) VALUES (?, ?, ?)")
    .run(categoryId, "Video Games", "video-games");
  client
    .prepare(
      "INSERT INTO tracks (id, title, audio_url, difficulty) VALUES (?, ?, ?, ?)",
    )
    .run("track-1", "Main Theme", "data/music/main-theme.mp3", "easy");
  client
    .prepare(
      "INSERT INTO tracks (id, title, audio_url, difficulty) VALUES (?, ?, ?, ?)",
    )
    .run("track-2", "Boss Battle", "data/music/boss-battle.flac", "hard");
  for (const trackId of ["track-1", "track-2"]) {
    client
      .prepare(
        "INSERT INTO track_categories (track_id, category_id) VALUES (?, ?)",
      )
      .run(trackId, categoryId);
  }

  const trackList = await getTrackTitlesWithDifficultyForCategory(
    db,
    categoryId,
  );

  assertEquals(trackList, [
    { title: "Main Theme", difficulty: "easy", filename: "main-theme" },
    { title: "Boss Battle", difficulty: "hard", filename: "boss-battle" },
  ]);

  // The endpoint must never leak the directory or extension.
  for (const track of trackList) {
    assert(!track.filename.includes("/"), "filename leaked a path separator");
    assert(!track.filename.includes("."), "filename leaked an extension");
  }
});
