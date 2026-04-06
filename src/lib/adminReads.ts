import type { db } from "../db/db.ts";

export type DrizzleDb = typeof db;

/** Categories ordered by display name (shared by admin dashboard and category list). */
export function listAdminCategories(database: DrizzleDb) {
  return database.query.categories.findMany({
    orderBy: (categoryRow, { asc }) => asc(categoryRow.name),
  });
}

/** Tracks ordered by title (shared by admin dashboard). */
export function listAdminTracks(database: DrizzleDb) {
  return database.query.tracks.findMany({
    orderBy: (trackRow, { asc }) => asc(trackRow.title),
  });
}
