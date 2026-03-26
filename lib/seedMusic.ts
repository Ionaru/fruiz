import { join } from "node:path";

import { eq } from "drizzle-orm";

import { db } from "../db/db.ts";
import { categories, trackCategories, tracks } from "../db/schema.ts";

export type DrizzleDb = typeof db;

const AUDIO_EXT = new Set([
  ".mp3",
  ".m4a",
  ".ogg",
  ".wav",
  ".flac",
  ".aac",
]);

export interface SeedMusicOptions {
  /** Directory relative to project root. Default: `data/music` */
  musicDir?: string;
  difficulty?: "easy" | "hard";
  /** When set, each new track is linked to this category (created if missing) */
  categorySlug?: string;
  /** Display name when creating the category; default: title-cased from `categorySlug` */
  categoryName?: string;
}

function posixRel(...parts: string[]): string {
  return join(...parts).replaceAll("\\", "/");
}

function titleFromFilename(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  const spaced = base.replaceAll(/[_-]+/g, " ").replaceAll(/\s+/g, " ").trim();
  return spaced || fileName;
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function displayNameFromSlug(slug: string): string {
  const words = slug.replaceAll(/[_-]+/g, " ").trim().split(/\s+/);
  if (words.length === 0) return slug;
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

async function ensureCategoryId(
  drizzle: DrizzleDb,
  slug: string,
  nameOverride: string | undefined,
): Promise<string> {
  const [existing] = await drizzle
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  if (existing) return existing.id;

  const name = nameOverride?.trim() || displayNameFromSlug(slug);
  const [created] = await drizzle
    .insert(categories)
    .values({ name, slug })
    .returning({ id: categories.id });
  if (!created) {
    throw new Error("Failed to create category");
  }
  return created.id;
}

/**
 * Inserts one row per audio file in `musicDir` (default `data/music`).
 * Skips files whose `audio_url` already exists. Paths are stored with `/` so
 * `/api/listen/:id` can resolve them on all platforms.
 * If `categorySlug` is set, the category is created when missing (`categoryName` optional).
 */
export async function seedTracksFromMusicDir(
  drizzle: DrizzleDb,
  options: SeedMusicOptions = {},
): Promise<{ inserted: number; skipped: number }> {
  const musicDir = options.musicDir ?? "data/music";
  const difficulty = options.difficulty ?? "easy";
  const absDir = join(Deno.cwd(), musicDir);

  const categoryId = options.categorySlug
    ? await ensureCategoryId(
      drizzle,
      options.categorySlug,
      options.categoryName,
    )
    : undefined;

  const entries: Deno.DirEntry[] = [];
  try {
    for await (const e of Deno.readDir(absDir)) {
      entries.push(e);
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      throw new Deno.errors.NotFound(
        `Music directory not found: ${
          posixRel(musicDir)
        } (create it and add audio files)`,
      );
    }
    throw e;
  }

  const audioFiles = entries
    .filter((e) => e.isFile && AUDIO_EXT.has(extOf(e.name)))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));

  const existingRows = await drizzle
    .select({ audioUrl: tracks.audioUrl })
    .from(tracks);
  const existing = new Set(
    existingRows.map((r) => r.audioUrl.replaceAll("\\", "/")),
  );

  let inserted = 0;
  let skipped = 0;

  for (const name of audioFiles) {
    const audioUrl = posixRel(musicDir, name);
    if (existing.has(audioUrl)) {
      skipped++;
      continue;
    }

    const [row] = await drizzle
      .insert(tracks)
      .values({
        title: titleFromFilename(name),
        audioUrl,
        difficulty,
      })
      .returning({ id: tracks.id });

    if (!row) continue;
    existing.add(audioUrl);
    inserted++;

    if (categoryId) {
      await drizzle.insert(trackCategories).values({
        trackId: row.id,
        categoryId,
      });
    }
  }

  return { inserted, skipped };
}
