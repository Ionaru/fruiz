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
