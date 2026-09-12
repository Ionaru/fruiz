import { normalizeAnswer } from "./normalize.ts";
import { matchTitleShorthand, shorthandKey } from "./titleShorthand.ts";

/**
 * A track the player has collected. It is playable, and its title is shown.
 */
export interface CollectedEntry {
  kind: "collected";
  id: string;
  title: string;
  /** Divider the entry sorts under, precomputed server-side. */
  letter: string;
  categories: string[];
  playbackGainDb: number | null;
  playbackGainSourceSize: number | null;
  playbackGainSourceMtimeMs: number | null;
}

/**
 * A track the player has not collected yet, shown as a locked slot in the
 * position its title would occupy.
 *
 * The title is deliberately absent, so the collection page never answers a quiz
 * question. Only the divider letter and the categories travel: grouping and
 * filtering need them and neither identifies the track.
 */
export interface LockedEntry {
  kind: "locked";
  letter: string;
  categories: string[];
}

export type CollectionEntry = CollectedEntry | LockedEntry;

/** One divider and the entries that sort under it. */
export interface LetterSection {
  letter: string;
  entries: CollectionEntry[];
}

/**
 * Divider letter for a title: its first character, uppercased. Digits stay
 * themselves rather than folding into a "#" bucket, so "1-2-Switch" groups
 * under "1"; a blank title falls back to "#".
 *
 * Accents are stripped first because titles are ordered with `localeCompare`,
 * which files "Ángel" among the A's. Unfolded, its "Á" would open a second
 * divider wedged between two runs of A's, and the grouping pass assumes a
 * letter's entries are contiguous.
 */
export function groupLetterForTitle(title: string): string {
  const firstCharacter = title.trim().charAt(0);
  if (firstCharacter === "") return "#";
  return firstCharacter
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleUpperCase();
}

/**
 * Whether a title matches a search query, using the same normalization as
 * guess scoring (`normalizeAnswer`) so searching behaves the way answering
 * does: accents, case and punctuation are ignored.
 *
 * A query that is no substring of the title still matches when it is a
 * shorthand for it (`csgo`, `civ 6`), the same rule the answer field's
 * autocomplete uses.
 */
export function matchesCollectionSearch(title: string, query: string): boolean {
  const normalizedQuery = normalizeAnswer(query);
  if (normalizedQuery === "") return true;
  if (normalizeAnswer(title).includes(normalizedQuery)) return true;
  return matchTitleShorthand(title, shorthandKey(query)) !== null;
}

export interface CollectionFilter {
  /** Category name to keep, or `null` for every category. */
  category: string | null;
  /** Free-text query; blank means no search is active. */
  query: string;
}

/**
 * Narrow the catalog to what the current filter and search should show.
 *
 * A locked slot has no title to match, so an active search drops them all
 * rather than leaving unexplained gaps. With no query they stay, which is what
 * makes a letter group read as a set to complete.
 */
export function filterCollectionEntries(
  entries: readonly CollectionEntry[],
  filter: CollectionFilter,
): CollectionEntry[] {
  const isSearching = normalizeAnswer(filter.query) !== "";
  const kept: CollectionEntry[] = [];
  for (const entry of entries) {
    if (
      filter.category !== null && !entry.categories.includes(filter.category)
    ) {
      continue;
    }
    if (entry.kind === "locked") {
      if (isSearching) continue;
      kept.push(entry);
      continue;
    }
    if (!matchesCollectionSearch(entry.title, filter.query)) continue;
    kept.push(entry);
  }
  return kept;
}

/**
 * Split an already-sorted list into consecutive runs sharing a divider letter.
 * Entries arrive ordered by title, so a letter's entries are always contiguous
 * and a single pass is enough.
 */
export function groupIntoLetterSections(
  entries: readonly CollectionEntry[],
): LetterSection[] {
  const sections: LetterSection[] = [];
  for (const entry of entries) {
    const current = sections[sections.length - 1];
    if (current && current.letter === entry.letter) {
      current.entries.push(entry);
      continue;
    }
    sections.push({ letter: entry.letter, entries: [entry] });
  }
  return sections;
}

/** How many of `entries` the player still has to collect. */
export function countLockedEntries(
  entries: readonly CollectionEntry[],
): number {
  return entries.filter((entry) => entry.kind === "locked").length;
}

/**
 * The line under the progress bar. Zero hidden tracks is a real state and
 * deserves better than "0 tracks still hidden".
 */
export function formatHiddenTracksLine(hidden: number): string {
  if (hidden <= 0) return "Every track collected";
  if (hidden === 1) return "1 track still hidden";
  return `${hidden} tracks still hidden`;
}

/**
 * A catalog row as the server reads it, titles and all.
 *
 * Declared structurally rather than imported from `collections.ts`, so this
 * module (which ships to the browser) never pulls in the database layer.
 */
export interface CatalogTrack {
  trackId: string;
  title: string;
  collected: boolean;
  categories: string[];
  playbackGainDb: number | null;
  playbackGainSourceSize: number | null;
  playbackGainSourceMtimeMs: number | null;
}

/**
 * Project the server's catalog into what the browser is allowed to see.
 *
 * The page's privacy boundary. An uncollected track keeps its position and its
 * divider letter, so a letter group still reads as a set with gaps, but loses
 * its title and id: either would turn the collection into a quiz answer key.
 */
export function toCollectionEntries(
  catalog: readonly CatalogTrack[],
): CollectionEntry[] {
  return catalog.map((track) =>
    track.collected
      ? {
        kind: "collected",
        id: track.trackId,
        title: track.title,
        letter: groupLetterForTitle(track.title),
        categories: track.categories,
        playbackGainDb: track.playbackGainDb,
        playbackGainSourceSize: track.playbackGainSourceSize,
        playbackGainSourceMtimeMs: track.playbackGainSourceMtimeMs,
      }
      : {
        kind: "locked",
        letter: groupLetterForTitle(track.title),
        categories: track.categories,
      }
  );
}
