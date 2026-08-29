import { join } from "node:path";

import { AUDIO_EXT } from "./audioExtensions.ts";
import { absolutePathFromTracksAudioUrl } from "./audioFilePath.ts";

/** An audio file in the music directory together with its last-modified time. */
export interface MusicDirEntry {
  /** Repo-relative POSIX path, e.g. `data/music/song.mp3`. */
  audioUrl: string;
  /** Milliseconds since epoch, or `null` when the file could not be stat'd. */
  modifiedAtMs: number | null;
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function posixRel(...parts: string[]): string {
  return join(...parts).replaceAll("\\", "/");
}

/**
 * Normalizes a stored `tracks.audio_url` so it can be compared with the paths
 * `listAudioFilesInMusicDir` returns: trims, converts backslashes, and drops a
 * leading slash. Comparison stays case-sensitive on purpose so it agrees
 * exactly with the membership check the track form handlers already apply.
 */
function comparableAudioPath(audioUrl: string): string {
  return audioUrl.trim().replaceAll("\\", "/").replace(/^\/+/, "");
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

/**
 * The paths in `audioUrls` that no track points at. A stored value that is not
 * a music-directory path at all (a remote URL, say) simply matches nothing, so
 * the file stays listed as unlinked — the safe direction.
 */
export function filterUnlinkedAudioUrls(
  audioUrls: readonly string[],
  linkedAudioUrls: Iterable<string>,
): string[] {
  const linked = new Set<string>();
  for (const linkedAudioUrl of linkedAudioUrls) {
    linked.add(comparableAudioPath(linkedAudioUrl));
  }
  return audioUrls.filter(
    (audioUrl) => !linked.has(comparableAudioPath(audioUrl)),
  );
}

/**
 * Newest first, so a just-copied file leads the list. Entries with an unknown
 * modification time sort last; ties fall back to a locale-aware path compare.
 */
export function sortAudioEntriesByNewestFirst(
  entries: readonly MusicDirEntry[],
): MusicDirEntry[] {
  return [...entries].sort((left, right) => {
    const leftTime = left.modifiedAtMs ?? Number.NEGATIVE_INFINITY;
    const rightTime = right.modifiedAtMs ?? Number.NEGATIVE_INFINITY;
    if (leftTime !== rightTime) return rightTime - leftTime;
    return left.audioUrl.localeCompare(right.audioUrl);
  });
}

/**
 * Reads the modification time of each path. A file that disappears between
 * listing and stat yields `modifiedAtMs: null` instead of failing the page.
 */
export function readAudioEntryModifiedTimes(
  audioUrls: readonly string[],
): Promise<MusicDirEntry[]> {
  return Promise.all(audioUrls.map(async (audioUrl) => {
    try {
      const fileInfo = await Deno.stat(
        absolutePathFromTracksAudioUrl(audioUrl),
      );
      return { audioUrl, modifiedAtMs: fileInfo.mtime?.getTime() ?? null };
    } catch {
      return { audioUrl, modifiedAtMs: null };
    }
  }));
}
