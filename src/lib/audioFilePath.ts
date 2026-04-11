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
