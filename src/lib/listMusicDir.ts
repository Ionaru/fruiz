import { join } from "node:path";

import { AUDIO_EXT } from "./audioExtensions.ts";

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function posixRel(...parts: string[]): string {
  return join(...parts).replaceAll("\\", "/");
}

/**
 * Returns repo-relative audio paths in `musicDir` (default `data/music`).
 * Missing directory is treated as empty for admin dropdown UX.
 */
export async function listAudioFilesInMusicDir(
  musicDir = "data/music",
): Promise<string[]> {
  const absDir = join(Deno.cwd(), musicDir);
  const out: string[] = [];
  try {
    for await (const e of Deno.readDir(absDir)) {
      if (!e.isFile) continue;
      if (!AUDIO_EXT.has(extOf(e.name))) continue;
      out.push(posixRel(musicDir, e.name));
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return [];
    throw e;
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}
