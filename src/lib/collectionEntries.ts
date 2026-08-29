import { normalizeAnswer } from "./normalize.ts";

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
 * The title is deliberately absent: the slot marks that something is missing
 * without naming it, so the collection page never answers a quiz question. Only
 * the divider letter and the categories travel, because grouping and filtering
 * need them and neither identifies the track.
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
 * themselves rather than folding into a shared "#" bucket, so "1-2-Switch"
 * groups under "1". A blank title falls back to "#" so it still lands
 * somewhere.
 *
 * Accents are stripped first, and that is not cosmetic. Titles are ordered with
 * `localeCompare`, which files "Ángel" among the A's — but its raw first
 * character is "Á", so without folding it would open a second divider wedged
 * between two runs of A's, and the grouping pass (which assumes a letter's
 * entries are contiguous) would emit "A", "Á", "A".
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
 */
export function matchesCollectionSearch(title: string, query: string): boolean {
  const normalizedQuery = normalizeAnswer(query);
  if (normalizedQuery === "") return true;
  return normalizeAnswer(title).includes(normalizedQuery);
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
 * A locked slot has no title to match, so an active search drops every locked
 * slot rather than leaving unexplained gaps in the results. With no query the
 * locked slots stay, which is what makes a letter group read as a set to
 * complete.
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
 * Declared structurally here rather than imported from `collections.ts` so this
 * module — which ships to the browser — never pulls the database layer into its
 * import graph.
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
 * This is the page's privacy boundary. An uncollected track keeps its position
 * and its divider letter, because that is what makes a letter group read as a
 * set with gaps, but loses its title and its id — sending either would turn the
 * collection into an answer key for the quiz.
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
