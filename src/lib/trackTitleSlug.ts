const MAX_LEN = 80;

/**
 * ASCII-safe filename stem from a track title (no extension).
 */
export function slugifyTrackTitleForFilename(title: string): string {
  let s = title.trim().toLowerCase();
  s = s.replaceAll(/[\s_]+/g, "-");
  s = s.replaceAll(/[^a-z0-9-]/g, "");
  s = s.replaceAll(/-+/g, "-").replace(/^-+/g, "").replace(/-+$/g, "");
  if (s.length > MAX_LEN) {
    s = s.slice(0, MAX_LEN).replace(/-+$/g, "");
  }
  return s || "track";
}
