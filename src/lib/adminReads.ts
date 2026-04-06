import type { DB } from "../db/db.ts";

/** Categories ordered by display name (shared by admin dashboard and category list). */
export function listAdminCategories(database: DB) {
  return database.query.categories.findMany({
    orderBy: (categoryRow, { asc }) => asc(categoryRow.name),
  });
}

/** Tracks ordered by title (shared by admin dashboard). */
export function listAdminTracks(database: DB) {
  return database.query.tracks.findMany({
    orderBy: (trackRow, { asc }) => asc(trackRow.title),
  });
}
