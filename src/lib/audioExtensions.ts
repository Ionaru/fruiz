/** Lowercase extensions including dot, aligned with seeding and streaming. */
export const AUDIO_EXT = new Set([
  ".mp3",
  ".m4a",
  ".ogg",
  ".wav",
  ".flac",
  ".aac",
]);

const EXT_TO_MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".aac": "audio/aac",
};

/** `Content-Type` for `/api/listen` and similar; falls back to `audio/mpeg`. */
export function contentTypeForAudioPath(path: string): string {
  const i = path.lastIndexOf(".");
  if (i < 0) return "audio/mpeg";
  const ext = path.slice(i).toLowerCase();
  return EXT_TO_MIME[ext] ?? "audio/mpeg";
}
