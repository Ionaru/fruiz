import type { DifficultyMode } from "./types.ts";

const DIFF_PREFIX: Record<DifficultyMode, string> = {
  easy: "e",
  hard: "h",
  mixed: "m",
};

const PREFIX_TO_DIFF: Record<string, DifficultyMode> = {
  e: "easy",
  h: "hard",
  m: "mixed",
};

const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function encodeSlug(difficulty: DifficultyMode, seed: string): string {
  const difficultyPrefix = DIFF_PREFIX[difficulty];
  if (!difficultyPrefix) throw new Error("Invalid difficulty");
  return `${difficultyPrefix}${seed}`;
}

export function decodeSlug(
  slug: string,
): { difficulty: DifficultyMode; seed: string } | null {
  if (!slug || slug.length < 2) return null;
  const pathPrefixChar = slug[0]!;
  const difficulty = PREFIX_TO_DIFF[pathPrefixChar];
  if (!difficulty) return null;
  const seed = slug.slice(1);
  if (!/^[0-9a-zA-Z]+$/.test(seed) || seed.length < 6 || seed.length > 8) {
    return null;
  }
  return { difficulty, seed };
}

export function generateShortSeed(length = 7): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let byteIndex = 0; byteIndex < length; byteIndex++) {
    out += BASE62[bytes[byteIndex]! % BASE62.length]!;
  }
  return out;
}
