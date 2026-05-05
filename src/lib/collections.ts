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

export async function getCollectionStatsByCategory(
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

  return rows
    .map((row) => ({
      categorySlug: row.categorySlug,
      categoryName: row.categoryName,
      total: Number(row.total),
      collected: Number(row.collected),
    }))
    .filter((row) => row.collected > 0);
}

export async function getCategorizedTrackCount(db: DB): Promise<number> {
  const rows = await db
    .select({
      total: sql<number>`count(distinct ${trackCategories.trackId})`,
    })
    .from(trackCategories);
  return Number(rows[0]?.total ?? 0);
}
