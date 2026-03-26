/** Normalize answer strings for comparison (case, whitespace, punctuation). */
export function normalizeAnswer(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s·]+/g, " ")
    .replace(/[.,:;'"`\-–—()[\]{}!?]+/g, "")
    .trim();
}
