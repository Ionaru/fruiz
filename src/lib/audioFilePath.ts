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
 * The bare filename of a track's `audioUrl` — directory and extension stripped.
 * For verification UIs/APIs: deliberately NEVER returns the full path.
 */
export function filenameFromAudioUrl(audioUrl: string): string {
  const normalized = audioUrl.trim().replaceAll("\\", "/");
  // Drop any query/hash (manual audioUrl entries may be remote URLs).
  const pathPart = normalized.replace(/[?#].*$/, "");
  const base = pathPart.slice(pathPart.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot) : base;
}
