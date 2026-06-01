import type { DifficultyMode } from "./types.ts";

const DIFF_PREFIX: Record<DifficultyMode, string> = {
  easy: "e",
  hard: "h",
};

const PREFIX_TO_DIFF: Record<string, DifficultyMode> = {
  e: "easy",
  h: "hard",
  // Legacy "mixed" links: "mixed" selected the whole pool, which is exactly
  // what "hard" means now, so old `m…` slugs decode to the same 20 tracks.
  m: "hard",
};

const CODE_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CODE_LENGTH = 3;

export function encodeSlug(difficulty: DifficultyMode, code: string): string {
  const difficultyPrefix = DIFF_PREFIX[difficulty];
  if (!difficultyPrefix) throw new Error("Invalid difficulty");
  return `${difficultyPrefix}${code}`;
}

export function decodeSlug(
  slug: string,
): { difficulty: DifficultyMode; code: string } | null {
  if (!slug || slug.length < 2) return null;
  const pathPrefixChar = slug.charAt(0);
  const difficulty = PREFIX_TO_DIFF[pathPrefixChar];
  if (!difficulty) return null;
  const code = slug.slice(1);
  if (!/^[0-9A-Z]{3}$/.test(code)) {
    return null;
  }
  return { difficulty, code };
}

export function generateShortCode(length = CODE_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) {
    out += CODE_ALPHABET.charAt(byte % CODE_ALPHABET.length);
  }
  return out;
}
