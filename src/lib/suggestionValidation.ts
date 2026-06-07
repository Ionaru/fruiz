/**
 * Pure, DB-free validation for track suggestions. Kept separate from
 * `trackSuggestions.ts` so the client island can import it without pulling the
 * database/drizzle module graph into the browser bundle.
 */

export type SuggestionStatus = "pending" | "approved" | "denied";

/**
 * Accepts any well-formed `http`/`https` URL (the suggestion link is not
 * restricted to YouTube).
 */
export function isValidSuggestionUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed === "") return false;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

export type SuggestionInputError = "missing_title" | "invalid_url";

export type ValidatedSuggestionInput =
  | { ok: true; title: string; youtubeUrl: string }
  | { ok: false; error: SuggestionInputError };

/**
 * Validates the player-supplied fields. Category existence is checked
 * separately because it needs the database.
 */
export function validateSuggestionInput(
  title: string,
  youtubeUrl: string,
): ValidatedSuggestionInput {
  const trimmedTitle = title.trim();
  if (trimmedTitle === "") return { ok: false, error: "missing_title" };
  const trimmedUrl = youtubeUrl.trim();
  if (!isValidSuggestionUrl(trimmedUrl)) {
    return { ok: false, error: "invalid_url" };
  }
  return { ok: true, title: trimmedTitle, youtubeUrl: trimmedUrl };
}
