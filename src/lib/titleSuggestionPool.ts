/**
 * `localeCompare` rather than SQLite's binary collation, so "apple" files among
 * the A's instead of after every capital letter (as `getCollectionCatalog`
 * does). Distinct strings can still collate equal (a precomposed "é" against
 * its decomposed form), so those fall back to a code-point comparison and the
 * order never depends on the order the titles arrived in.
 */
function compareTitles(left: string, right: string): number {
  const byCollation = left.localeCompare(right);
  if (byCollation !== 0) return byCollation;
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/**
 * The pool a title autocomplete searches: each title once, alphabetically.
 *
 * Both the quiz's pool and the suggestion page's are built here.
 * `suggestMatches` is stable within a rank, so the pool's order is the order
 * the dropdown lists equally good matches in; sharing it keeps the two
 * dropdowns from ranking the same titles differently.
 */
export function toTitleSuggestionPool(titles: Iterable<string>): string[] {
  return [...new Set(titles)].sort(compareTitles);
}
