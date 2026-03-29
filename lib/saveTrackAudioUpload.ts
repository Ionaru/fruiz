import { join } from "node:path";

import { AUDIO_EXT } from "./audioExtensions.ts";
import { slugifyTrackTitleForFilename } from "./trackTitleSlug.ts";

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_COLLISION_ATTEMPTS = 1000;

/**
 * Repo-relative upload directory. Empty or whitespace → `data/music`.
 * Rejects `..` path segments (same idea as listen route).
 */
export function normalizeUploadDir(raw: string | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  const relRaw = (trimmed === "" ? "data/music" : trimmed).replaceAll(
    "\\",
    "/",
  );
  const segments = relRaw.split("/").filter((s) => s.length > 0);
  if (segments.length === 0) return null;
  if (segments.includes("..")) return null;
  return segments.join("/");
}

function extFromFileName(name: string): string | null {
  const i = name.lastIndexOf(".");
  if (i < 0) return null;
  const ext = name.slice(i).toLowerCase();
  return AUDIO_EXT.has(ext) ? ext : null;
}

/** When the browser omits a useful filename, infer extension from MIME type. */
const MIME_TO_EXT: Record<string, string> = {
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/wav": ".wav",
  "audio/wave": ".wav",
  "audio/x-wav": ".wav",
  "audio/ogg": ".ogg",
  "application/ogg": ".ogg",
  "audio/flac": ".flac",
  "audio/x-flac": ".flac",
  "audio/aac": ".aac",
  "audio/x-aac": ".aac",
};

function extFromUpload(file: File | Blob): string | null {
  if (file instanceof File && file.name) {
    const fromName = extFromFileName(file.name);
    if (fromName) return fromName;
  }
  const mime = file.type?.trim().toLowerCase() ?? "";
  const fromMime = mime ? MIME_TO_EXT[mime] : undefined;
  if (fromMime && AUDIO_EXT.has(fromMime)) return fromMime;
  return null;
}

function posixRel(dir: string, fileName: string): string {
  return `${dir}/${fileName}`.replaceAll("\\", "/");
}

async function firstNonExistingFilePath(
  absDir: string,
  base: string,
  ext: string,
): Promise<{ absPath: string; stem: string } | null> {
  for (let n = 0; n < MAX_COLLISION_ATTEMPTS; n++) {
    const stem = n === 0 ? base : `${base}-${n + 1}`;
    const fname = `${stem}${ext}`;
    const candidate = join(absDir, fname);
    try {
      await Deno.stat(candidate);
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        return { absPath: candidate, stem };
      }
      return null;
    }
  }
  return null;
}

/**
 * Saves upload under cwd. Returns repo-relative `audioUrl` or `null` on failure.
 */
export async function saveTrackAudioUpload(
  file: File | Blob,
  title: string,
  options: { uploadDir?: string } = {},
): Promise<string | null> {
  if (file.size <= 0 || file.size > MAX_BYTES) return null;

  const uploadDir = normalizeUploadDir(options.uploadDir);
  if (!uploadDir) return null;

  const ext = extFromUpload(file);
  if (!ext) return null;

  const base = slugifyTrackTitleForFilename(title);
  const absDir = join(Deno.cwd(), ...uploadDir.split("/"));

  try {
    await Deno.mkdir(absDir, { recursive: true });
  } catch {
    return null;
  }

  const picked = await firstNonExistingFilePath(absDir, base, ext);
  if (!picked) return null;

  try {
    const dest = await Deno.open(picked.absPath, {
      create: true,
      write: true,
      truncate: true,
    });
    try {
      await file.stream().pipeTo(dest.writable);
    } finally {
      dest.close();
    }
  } catch {
    try {
      await Deno.remove(picked.absPath);
    } catch {
      /* ignore */
    }
    return null;
  }

  return posixRel(uploadDir, `${picked.stem}${ext}`);
}

/** Prefer uploaded file when present; else manual `audioUrl` field. */
export async function resolveTrackFormAudioUrl(
  form: FormData,
): Promise<string | null> {
  const title = String(form.get("title") ?? "").trim();
  const uploadDir = String(form.get("uploadDir") ?? "");
  const audioUrlManual = String(form.get("audioUrl") ?? "").trim();
  const audioFile = form.get("audioFile");

  // `Blob` covers `File`; some runtimes still deliver uploads as generic blobs.
  if (audioFile instanceof Blob && audioFile.size > 0) {
    return await saveTrackAudioUpload(audioFile, title, { uploadDir });
  }
  if (audioUrlManual) return audioUrlManual;
  return null;
}
