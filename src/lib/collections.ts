import { and, eq, sql } from "drizzle-orm";

import type { DB } from "../db/db.ts";
import { categories, collectedTracks, trackCategories } from "../db/schema.ts";
import type { CategoryCollectionProgress } from "./collectionProgress.ts";

export async function getCategoryCollectionStats(
  db: DB,
  userId: string,
  categorySlug: string,
): Promise<CategoryCollectionProgress | null> {
  const rows = await db
    .select({
      categoryName: categories.name,
      total: sql<number>`count(distinct ${trackCategories.trackId})`,
      collected: sql<number>`count(distinct ${collectedTracks.trackId})`,
    })
    .from(categories)
    .leftJoin(trackCategories, eq(trackCategories.categoryId, categories.id))
    .leftJoin(
      collectedTracks,
      and(
        eq(collectedTracks.trackId, trackCategories.trackId),
        eq(collectedTracks.userId, userId),
      ),
    )
    .where(eq(categories.slug, categorySlug))
    .groupBy(categories.id, categories.name);

  const row = rows[0];
  if (!row) return null;
  return {
    categoryName: row.categoryName,
    total: Number(row.total),
    collected: Number(row.collected),
  };
}

export interface CategoryCollectionStatsRow {
  categorySlug: string;
  categoryName: string;
  collected: number;
  total: number;
}

/**
 * Collection totals for every category that has tracks, including the ones this
 * player has not collected from yet (`collected: 0`). The menu needs those rows
 * so a category can show an empty progress bar rather than none at all, and the
 * collection page offers them all as filters: now that uncollected tracks show
 * as locked slots, a `0 / 52` category is the most informative filter there is
 * rather than dead weight.
 */
export async function getCollectionStatsForAllCategories(
  db: DB,
  userId: string,
): Promise<CategoryCollectionStatsRow[]> {
  const rows = await db
    .select({
      categorySlug: categories.slug,
      categoryName: categories.name,
      total: sql<number>`count(distinct ${trackCategories.trackId})`,
      collected: sql<number>`count(distinct ${collectedTracks.trackId})`,
    })
    .from(categories)
    .innerJoin(trackCategories, eq(trackCategories.categoryId, categories.id))
    .leftJoin(
      collectedTracks,
      and(
        eq(collectedTracks.trackId, trackCategories.trackId),
        eq(collectedTracks.userId, userId),
      ),
    )
    .groupBy(categories.id, categories.slug, categories.name);

  return rows.map((row) => ({
    categorySlug: row.categorySlug,
    categoryName: row.categoryName,
    total: Number(row.total),
    collected: Number(row.collected),
  }));
}

/** Collected-track counts keyed by category slug, for the menu's progress bars. */
export async function getCollectedCountsBySlug(
  db: DB,
  userId: string,
): Promise<Record<string, number>> {
  const rows = await getCollectionStatsForAllCategories(db, userId);
  const countsBySlug: Record<string, number> = {};
  for (const row of rows) {
    countsBySlug[row.categorySlug] = row.collected;
  }
  return countsBySlug;
}

export async function getCategorizedTrackCount(db: DB): Promise<number> {
  const rows = await db
    .select({
      total: sql<number>`count(distinct ${trackCategories.trackId})`,
    })
    .from(trackCategories);
  return Number(rows[0]?.total ?? 0);
}

export interface CollectionCatalogEntry {
  trackId: string;
  title: string;
  collected: boolean;
  categories: string[];
  playbackGainDb: number | null;
  playbackGainSourceSize: number | null;
  playbackGainSourceMtimeMs: number | null;
}

/**
 * Every categorized track, ordered by title, flagged with whether this player
 * has collected it.
 *
 * The collection page needs the uncollected ones so it can show them as locked
 * slots in the alphabetical position their titles would occupy. Those titles
 * are read here but must not be serialized to the browser — the route projects
 * them away and keeps only the divider letter.
 *
 * Two reads rather than one join: `count(distinct …)` is not needed for a
 * per-track flag, and a membership lookup avoids the join fan-out that a track
 * in several categories would otherwise produce. Ordering is done in TypeScript
 * so it stays `localeCompare`, matching what the page has always shown, rather
 * than SQLite's binary collation.
 */
export async function getCollectionCatalog(
  db: DB,
  userId: string,
): Promise<CollectionCatalogEntry[]> {
  const [allTracks, collectedRows] = await Promise.all([
    db.query.tracks.findMany({
      columns: {
        id: true,
        title: true,
        playbackGainDb: true,
        playbackGainSourceSize: true,
        playbackGainSourceMtimeMs: true,
      },
      with: { categories: { columns: { name: true } } },
    }),
    db.query.collectedTracks.findMany({
      where: { userId },
      columns: { trackId: true },
    }),
  ]);

  const collectedTrackIds = new Set(collectedRows.map((row) => row.trackId));

  const catalog: CollectionCatalogEntry[] = [];
  for (const track of allTracks) {
    // Uncategorized tracks are excluded from `getCategorizedTrackCount`, so
    // leaving them out here too keeps the list and the totals agreeing.
    if (track.categories.length === 0) continue;
    catalog.push({
      trackId: track.id,
      title: track.title,
      collected: collectedTrackIds.has(track.id),
      categories: track.categories.map((category) => category.name),
      playbackGainDb: track.playbackGainDb,
      playbackGainSourceSize: track.playbackGainSourceSize,
      playbackGainSourceMtimeMs: track.playbackGainSourceMtimeMs,
    });
  }
  catalog.sort((left, right) => left.title.localeCompare(right.title));
  return catalog;
}
