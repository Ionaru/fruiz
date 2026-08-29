import type { DB } from "../db/db.ts";
import { tracks } from "../db/schema.ts";
import {
  filterUnlinkedAudioUrls,
  listAudioFilesInMusicDir,
  type MusicDirEntry,
  readAudioEntryModifiedTimes,
  sortAudioEntriesByNewestFirst,
} from "./listMusicDir.ts";

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

/**
 * Audio files sitting in the music directory that no track points at yet,
 * newest first. Filtering before reading modification times keeps the
 * filesystem work proportional to the (small) unlinked set rather than to the
 * whole library.
 */
export async function listUnlinkedAudioFiles(
  database: DB,
  musicDir?: string,
): Promise<MusicDirEntry[]> {
  const audioFiles = await listAudioFilesInMusicDir(musicDir);
  if (audioFiles.length === 0) return [];
  const linkedRows = await database
    .selectDistinct({ audioUrl: tracks.audioUrl })
    .from(tracks);
  const unlinkedAudioUrls = filterUnlinkedAudioUrls(
    audioFiles,
    linkedRows.map((row) => row.audioUrl),
  );
  return sortAudioEntriesByNewestFirst(
    await readAudioEntryModifiedTimes(unlinkedAudioUrls),
  );
}
