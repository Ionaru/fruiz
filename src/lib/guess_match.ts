import { normalizeAnswer } from "./normalize.ts";

/**
 * Whether `raw` matches at least one title in `suggestions` using the same
 * normalization as scoring (`normalizeAnswer`).
 */
export function guessMatchesSuggestionPool(
  raw: string,
  suggestions: readonly string[],
): boolean {
  if (raw.trim() === "") return false;
  const normalizedInput = normalizeAnswer(raw);
  return suggestions.some(
    (title) => normalizeAnswer(title) === normalizedInput,
  );
}

/**
 * Rank a title against the normalized query.
 * 0 = exact, 1 = startsWith, 2 = contains, -1 = no match.
 */
function matchRank(normalizedTitle: string, normalizedQuery: string): number {
  if (normalizedTitle === normalizedQuery) return 0;
  if (normalizedTitle.startsWith(normalizedQuery)) return 1;
  if (normalizedTitle.includes(normalizedQuery)) return 2;
  return -1;
}

/**
 * Filter `suggestions` down to the best matches for `raw`, using the same
 * normalization as scoring (`normalizeAnswer`).
 *
 * Returns up to `limit` titles, ranked exact > startsWith > contains, stable
 * within each tier (input order preserved). Returns `[]` for empty or
 * whitespace-only input so the caller can treat "no query" as "no dropdown".
 */
export function suggestMatches(
  raw: string,
  suggestions: readonly string[],
  limit: number,
): string[] {
  if (raw.trim() === "") return [];
  const normalizedQuery = normalizeAnswer(raw);
  if (normalizedQuery === "") return [];

  const ranked: { title: string; rank: number; index: number }[] = [];
  let index = 0;
  for (const title of suggestions) {
    const rank = matchRank(normalizeAnswer(title), normalizedQuery);
    if (rank >= 0) ranked.push({ title, rank, index });
    index++;
  }

  ranked.sort((left, right) =>
    left.rank === right.rank ? left.index - right.index : left.rank - right.rank
  );

  return ranked.slice(0, Math.max(0, limit)).map((entry) => entry.title);
}
