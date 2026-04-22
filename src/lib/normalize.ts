/** Normalize answer strings for comparison (case, whitespace, punctuation). */
export function normalizeAnswer(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[\s·]+/g, " ")
    .replace(/[.,:;'"`\-–—()[\]{}!?]+/g, "")
    .trim();
}
