import { eq, sql } from "drizzle-orm";

import { db } from "../db/db.ts";
import { categories, trackCategories, tracks } from "../db/schema.ts";
import type { DifficultyMode } from "./types.ts";

type DrizzleDb = typeof db;

const MIN_TRACKS = 20;

function countForDifficulty(
  total: number,
  easy: number,
  hard: number,
  difficulty: DifficultyMode,
): number {
  if (difficulty === "mixed") return total;
  if (difficulty === "easy") return easy;
  return hard;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
}

export interface AvailableQuizOption {
  category: CategoryRow;
  difficulties: DifficultyMode[];
}

/**
 * Per-category track counts for eligibility (>= MIN_TRACKS per selected difficulty mode).
 */
export async function loadCategoryTrackCounts(
  db: DrizzleDb,
): Promise<
  Map<
    string,
    { category: CategoryRow; total: number; easy: number; hard: number }
  >
> {
  const rows = await db
    .select({
      categoryId: categories.id,
      name: categories.name,
      slug: categories.slug,
      total: sql<number>`count(distinct ${tracks.id})`,
      easy: sql<
        number
      >`count(distinct case when ${tracks.difficulty} = 'easy' then ${tracks.id} end)`,
      hard: sql<
        number
      >`count(distinct case when ${tracks.difficulty} = 'hard' then ${tracks.id} end)`,
    })
    .from(categories)
    .innerJoin(trackCategories, eq(trackCategories.categoryId, categories.id))
    .innerJoin(tracks, eq(tracks.id, trackCategories.trackId))
    .groupBy(categories.id, categories.name, categories.slug);

  const map = new Map<
    string,
    { category: CategoryRow; total: number; easy: number; hard: number }
  >();
  for (const aggregateRow of rows) {
    map.set(aggregateRow.slug, {
      category: {
        id: aggregateRow.categoryId,
        name: aggregateRow.name,
        slug: aggregateRow.slug,
      },
      total: Number(aggregateRow.total),
      easy: Number(aggregateRow.easy),
      hard: Number(aggregateRow.hard),
    });
  }
  return map;
}

export async function getAvailableQuizOptions(
  db: DrizzleDb,
): Promise<AvailableQuizOption[]> {
  const map = await loadCategoryTrackCounts(db);
  const out: AvailableQuizOption[] = [];
  for (const { category, total, easy, hard } of map.values()) {
    const difficulties: DifficultyMode[] = [];
    for (
      const difficultyMode of ["easy", "hard", "mixed"] as DifficultyMode[]
    ) {
      if (
        countForDifficulty(total, easy, hard, difficultyMode) >= MIN_TRACKS
      ) {
        difficulties.push(difficultyMode);
      }
    }
    if (difficulties.length > 0) {
      out.push({ category, difficulties });
    }
  }
  out.sort((left, right) =>
    left.category.name.localeCompare(right.category.name)
  );
  return out;
}

export async function isQuizCombinationAvailable(
  db: DrizzleDb,
  categorySlug: string,
  difficulty: DifficultyMode,
): Promise<boolean> {
  const map = await loadCategoryTrackCounts(db);
  const row = map.get(categorySlug);
  if (!row) return false;
  return countForDifficulty(row.total, row.easy, row.hard, difficulty) >=
    MIN_TRACKS;
}

export async function getCategoryBySlug(
  db: DrizzleDb,
  slug: string,
): Promise<CategoryRow | null> {
  const [row] = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
    })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  if (!row) return null;
  return row;
}

export async function getTracksForCategory(
  db: DrizzleDb,
  categoryId: string,
): Promise<
  { id: string; title: string; audioUrl: string; difficulty: "easy" | "hard" }[]
> {
  const rows = await db
    .select({
      id: tracks.id,
      title: tracks.title,
      audioUrl: tracks.audioUrl,
      difficulty: tracks.difficulty,
    })
    .from(tracks)
    .innerJoin(trackCategories, eq(trackCategories.trackId, tracks.id))
    .where(eq(trackCategories.categoryId, categoryId));

  const seen = new Map<string, (typeof rows)[0]>();
  for (const trackRow of rows) {
    seen.set(trackRow.id, trackRow);
  }
  return [...seen.values()];
}

export async function getDistinctTitlesForCategory(
  db: DrizzleDb,
  categoryId: string,
): Promise<string[]> {
  const rows = await db
    .selectDistinct({ title: tracks.title })
    .from(tracks)
    .innerJoin(trackCategories, eq(trackCategories.trackId, tracks.id))
    .where(eq(trackCategories.categoryId, categoryId))
    .orderBy(tracks.title);

  return rows.map((row) => row.title);
}

/**
 * Parses the `limit` query param for per-player audio replay.
 * - Missing param → `null` (client should show the settings gate).
 * - Present but invalid → `0` (treat as unlimited / safe default).
 */
export function parseReplayLimitFromUrl(
  searchParams: URLSearchParams,
): number | null {
  if (!searchParams.has("limit")) return null;
  const raw = searchParams.get("limit");
  if (raw === null || raw === "") return 0;
  const parsedLimit = Number(raw);
  return Number.isFinite(parsedLimit) && parsedLimit >= 0
    ? Math.floor(parsedLimit)
    : 0;
}
