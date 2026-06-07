import { and, eq, sql } from "drizzle-orm";

import type { DB } from "../db/db.ts";
import { categories, trackCategories, tracks } from "../db/schema.ts";
import type { DifficultyMode } from "./types.ts";

const MIN_TRACKS = 20;

function countForDifficulty(
  total: number,
  easy: number,
  difficulty: DifficultyMode,
): number {
  if (difficulty === "easy") return easy;
  // "hard" spans the whole pool (formerly "mixed").
  return total;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
}

export interface DifficultyOption {
  mode: DifficultyMode;
  /** Size of the track pool this difficulty draws from (always >= MIN_TRACKS). */
  trackCount: number;
}

export interface AvailableQuizOption {
  category: CategoryRow;
  difficulties: DifficultyOption[];
}

/**
 * Per-category track counts for eligibility (>= MIN_TRACKS per selected difficulty mode).
 */
export async function loadCategoryTrackCounts(
  db: DB,
): Promise<
  Map<
    string,
    { category: CategoryRow; total: number; easy: number }
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
    })
    .from(categories)
    .innerJoin(trackCategories, eq(trackCategories.categoryId, categories.id))
    .innerJoin(tracks, eq(tracks.id, trackCategories.trackId))
    .groupBy(categories.id, categories.name, categories.slug);

  const map = new Map<
    string,
    { category: CategoryRow; total: number; easy: number }
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
    });
  }
  return map;
}

export async function getAvailableQuizOptions(
  db: DB,
): Promise<AvailableQuizOption[]> {
  const map = await loadCategoryTrackCounts(db);
  const out: AvailableQuizOption[] = [];
  for (const { category, total, easy } of map.values()) {
    const difficulties: DifficultyOption[] = [];
    for (
      const difficultyMode of ["easy", "hard"] as DifficultyMode[]
    ) {
      const trackCount = countForDifficulty(total, easy, difficultyMode);
      if (trackCount >= MIN_TRACKS) {
        difficulties.push({ mode: difficultyMode, trackCount });
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
  db: DB,
  categorySlug: string,
  difficulty: DifficultyMode,
): Promise<boolean> {
  const map = await loadCategoryTrackCounts(db);
  const row = map.get(categorySlug);
  if (!row) return false;
  return countForDifficulty(row.total, row.easy, difficulty) >=
    MIN_TRACKS;
}

export async function getCategoryBySlug(
  db: DB,
  slug: string,
): Promise<CategoryRow | null> {
  const row = await db.query.categories.findFirst({
    where: { slug },
  });
  if (!row) return null;
  return { id: row.id, name: row.name, slug: row.slug };
}

/** Resolve a category by its slug, falling back to its id (UUID). */
export async function getCategoryBySlugOrId(
  db: DB,
  key: string,
): Promise<CategoryRow | null> {
  const bySlug = await getCategoryBySlug(db, key);
  if (bySlug) return bySlug;
  const row = await db.query.categories.findFirst({
    where: { id: key },
  });
  if (!row) return null;
  return { id: row.id, name: row.name, slug: row.slug };
}

export async function getTracksForCategory(
  db: DB,
  categoryId: string,
): Promise<
  {
    id: string;
    title: string;
    audioUrl: string;
    difficulty: "easy" | "hard";
    playbackGainDb: number | null;
    clipPlaybackGainDb: number | null;
    playStartSeconds: number | null;
    maxPlaySeconds: number | null;
    playbackGainSourceSize: number | null;
    playbackGainSourceMtimeMs: number | null;
  }[]
> {
  const category = await db.query.categories.findFirst({
    where: { id: categoryId },
    with: {
      tracks: {
        orderBy: (t, { asc }) => asc(t.id),
      },
    },
  });
  if (!category) return [];
  return category.tracks.map((t) => ({
    id: t.id,
    title: t.title,
    audioUrl: t.audioUrl,
    difficulty: t.difficulty,
    playbackGainDb: t.playbackGainDb,
    clipPlaybackGainDb: t.clipPlaybackGainDb,
    playStartSeconds: t.playStartSeconds,
    maxPlaySeconds: t.maxPlaySeconds,
    playbackGainSourceSize: t.playbackGainSourceSize,
    playbackGainSourceMtimeMs: t.playbackGainSourceMtimeMs,
  }));
}

export async function getDistinctTitlesForCategory(
  db: DB,
  categoryId: string,
  difficulty?: DifficultyMode,
): Promise<string[]> {
  // Easy mode narrows the suggestion pool to easy-difficulty titles only, so the
  // autocomplete is genuinely easier. "hard" (and the unspecified case)
  // keep the full-category pool that deliberately hides which titles are in play.
  const categoryFilter = eq(trackCategories.categoryId, categoryId);
  const where = difficulty === "easy"
    ? and(categoryFilter, eq(tracks.difficulty, "easy"))
    : categoryFilter;

  const rows = await db
    .selectDistinct({ title: tracks.title })
    .from(tracks)
    .innerJoin(trackCategories, eq(trackCategories.trackId, tracks.id))
    .where(where)
    .orderBy(tracks.title);

  return rows.map((row) => row.title);
}

/** All tracks in a category as `{ title, difficulty }`, ordered by difficulty then title. */
export async function getTrackTitlesWithDifficultyForCategory(
  db: DB,
  categoryId: string,
): Promise<{ title: string; difficulty: "easy" | "hard" }[]> {
  const category = await db.query.categories.findFirst({
    where: { id: categoryId },
    with: {
      tracks: {
        columns: { title: true, difficulty: true },
        orderBy: (trackRow, { asc }) => [
          asc(trackRow.difficulty),
          asc(trackRow.title),
        ],
      },
    },
  });
  return category?.tracks ?? [];
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
