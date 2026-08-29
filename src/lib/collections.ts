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
 * so a category can show an empty progress bar rather than none at all.
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

/**
 * Categories this player actually holds tracks in — what the collection page
 * offers as filters, where an always-empty filter would be dead weight.
 */
export async function getCollectionStatsByCategory(
  db: DB,
  userId: string,
): Promise<CategoryCollectionStatsRow[]> {
  const rows = await getCollectionStatsForAllCategories(db, userId);
  return rows.filter((row) => row.collected > 0);
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
