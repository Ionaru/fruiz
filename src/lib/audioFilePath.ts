import { join } from "node:path";

/**
 * Resolves a track `audio_url` (repo-relative POSIX path) to an absolute filesystem path.
 * Rejects remote URLs and `..` segments (same rules as `/api/listen/:id`).
 */
export function absolutePathFromTracksAudioUrl(audioUrl: string): string {
  const s = audioUrl.trim();
  if (/^https?:\/\//i.test(s)) {
    throw new Deno.errors.NotFound();
  }
  const rel = s.replace(/^\/+/, "");
  if (!rel || rel.split(/[/\\]/).includes("..")) {
    throw new Deno.errors.NotFound();
  }
  return join(Deno.cwd(), ...rel.split("/"));
}

/**
 * The last path segment of a track's `audioUrl`, extension included. Query and
 * hash are dropped first so manually entered remote URLs behave like local
 * paths. Like `filenameFromAudioUrl`, never returns a path separator.
 */
export function basenameFromAudioUrl(audioUrl: string): string {
  const normalized = audioUrl.trim().replaceAll("\\", "/");
  // Drop any query/hash (manual audioUrl entries may be remote URLs).
  const pathPart = normalized.replace(/[?#].*$/, "");
  return pathPart.slice(pathPart.lastIndexOf("/") + 1);
}

/**
 * The bare filename of a track's `audioUrl` — directory and extension stripped.
 * For verification UIs/APIs: deliberately NEVER returns the full path.
 */
export function filenameFromAudioUrl(audioUrl: string): string {
  const base = basenameFromAudioUrl(audioUrl);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot) : base;
}

/**
 * A human-readable track title guessed from an audio filename: extension
 * stripped, `_` and `-` runs turned into single spaces, whitespace collapsed.
 * Falls back to the extension-less filename when that leaves nothing.
 *
 * Shared by the music-folder seeder and the admin new-track form, so a track
 * created either way starts from the same title.
 */
export function trackTitleFromAudioUrl(audioUrl: string): string {
  const filename = filenameFromAudioUrl(audioUrl);
  const spaced = filename
    .replaceAll(/[_-]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
  return spaced || filename;
}
