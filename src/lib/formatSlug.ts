/** URL-safe slug from a display name (admin categories). */
export function formatSlugFromName(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.length > 0 ? s : "category";
}

/**
 * Readable label for a slug when no stored display name is available — a quiz
 * saved in the browser can outlive the category it was started from.
 */
export function nameFromSlug(slug: string): string {
  return slug.replace(/-+/g, " ").trim();
}
