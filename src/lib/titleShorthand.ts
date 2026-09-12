import { normalizeAnswer } from "./normalize.ts";

/**
 * How a shorthand query met a title.
 *
 * - `"whole"` — the run covered every word of the title.
 * - `"partial"` — it started after the first word, or stopped before the last.
 */
export type TitleShorthandMatch = "whole" | "partial" | null;

/** Shortest query worth matching; a single character would pull in the library. */
const MIN_QUERY_LENGTH = 2;

/** Words of the raw title, plus `&` as a word of its own. */
const WORD_PATTERN = /&|[\p{L}\p{N}]+/gu;

/** Apostrophes are removed rather than split on, so a possessive fuses to its stem. */
const APOSTROPHE_PATTERN = /['’`]/gu;

/** A lowercase letter followed by an uppercase one, as in `RollerCoaster`. */
const CAMEL_BOUNDARY_PATTERN = /(\p{Ll})(\p{Lu})/gu;

const DIGITS_PATTERN = /^\d+$/;

/** Classic subtractive roman numeral. Callers only ever pass a non-empty token. */
const ROMAN_NUMERAL_PATTERN =
  /^M{0,3}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})$/;

const ROMAN_VALUES: ReadonlyArray<readonly [string, number]> = [
  ["M", 1000],
  ["CM", 900],
  ["D", 500],
  ["CD", 400],
  ["C", 100],
  ["XC", 90],
  ["L", 50],
  ["XL", 40],
  ["X", 10],
  ["IX", 9],
  ["V", 5],
  ["IV", 4],
  ["I", 1],
];

/** The forms one title word can be typed as. */
interface TitleWord {
  /** Matched by prefix, so a typed `civ` reaches `Civilization`. */
  prefixForms: string[];
  /**
   * Matched only in full. Numbers live here so a typed `ff1` cannot reach
   * `Final Fantasy XIII` through the leading `1` of `13`.
   */
  exactForms: string[];
  /** Whether the word may be passed over, so `cc` reaches `Command & Conquer`. */
  skippable: boolean;
}

function romanToArabic(roman: string): number {
  let remaining = roman.toUpperCase();
  let total = 0;
  while (remaining !== "") {
    const symbol = ROMAN_VALUES.find(([candidate]) =>
      remaining.startsWith(candidate)
    );
    if (symbol === undefined) return 0;
    total += symbol[1];
    remaining = remaining.slice(symbol[0].length);
  }
  return total;
}

function arabicToRoman(value: number): string {
  if (value <= 0 || value > 3999) return "";
  let remaining = value;
  let roman = "";
  for (const [symbol, symbolValue] of ROMAN_VALUES) {
    while (remaining >= symbolValue) {
      roman += symbol;
      remaining -= symbolValue;
    }
  }
  return roman;
}

/**
 * Comparable form of a typed query or of a title word: normalized the way
 * scoring normalizes, then stripped of spaces so `GTA 4` and `gta4` meet.
 */
export function shorthandKey(raw: string): string {
  return normalizeAnswer(raw).replaceAll(" ", "");
}

function buildWord(token: string): TitleWord {
  if (token === "&") {
    return { prefixForms: ["n", "and", "&"], exactForms: [], skippable: true };
  }

  if (DIGITS_PATTERN.test(token)) {
    const roman = arabicToRoman(Number(token)).toLowerCase();
    const exactForms = roman === "" ? [token] : [token, roman];
    return { prefixForms: [], exactForms, skippable: false };
  }

  const key = shorthandKey(token);
  if (key === "") return { prefixForms: [], exactForms: [], skippable: true };

  // Only an upper-case token is read as a numeral: titles write sequel numbers
  // as `IV`, while `Mix` or `Did` are words that merely spell one.
  const isNumeral = token === token.toLocaleUpperCase() &&
    ROMAN_NUMERAL_PATTERN.test(token);
  if (!isNumeral) {
    return { prefixForms: [key], exactForms: [], skippable: false };
  }

  const arabic = romanToArabic(token);
  return {
    prefixForms: [key],
    exactForms: arabic > 0 ? [String(arabic)] : [],
    skippable: false,
  };
}

/**
 * The title's words, in order, each carrying the forms it can be typed as.
 *
 * Built from the **raw** title rather than the normalized one: `normalizeAnswer`
 * deletes a hyphen without leaving a separator, so `Counter-Strike: Global
 * Offensive` would otherwise offer `cgo` instead of `csgo`.
 */
function splitTitleIntoWords(title: string): TitleWord[] {
  const separated = title
    .replaceAll(APOSTROPHE_PATTERN, "")
    .replaceAll(CAMEL_BOUNDARY_PATTERN, "$1 $2");
  const words: TitleWord[] = [];
  for (const token of separated.match(WORD_PATTERN) ?? []) {
    const word = buildWord(token);
    if (word.prefixForms.length > 0 || word.exactForms.length > 0) {
      words.push(word);
    }
  }
  return words;
}

/**
 * Index of the last word a run starting at `wordIndex` uses up to consume the
 * rest of `query`, or `-1` when the run cannot consume it. `visited` records
 * the states already found to fail, which keeps backtracking linear.
 */
function consumeFrom(
  words: readonly TitleWord[],
  wordIndex: number,
  query: string,
  offset: number,
  visited: Set<number>,
): number {
  if (offset >= query.length) return wordIndex - 1;
  if (wordIndex >= words.length) return -1;

  const stateKey = wordIndex * (query.length + 1) + offset;
  if (visited.has(stateKey)) return -1;
  visited.add(stateKey);

  const word = words[wordIndex];
  if (word === undefined) return -1;

  for (const form of word.exactForms) {
    if (!query.startsWith(form, offset)) continue;
    const lastWord = consumeFrom(
      words,
      wordIndex + 1,
      query,
      offset + form.length,
      visited,
    );
    if (lastWord >= 0) return lastWord;
  }

  for (const form of word.prefixForms) {
    const longestTake = Math.min(form.length, query.length - offset);
    for (let taken = 1; taken <= longestTake; taken++) {
      if (query[offset + taken - 1] !== form[taken - 1]) break;
      const lastWord = consumeFrom(
        words,
        wordIndex + 1,
        query,
        offset + taken,
        visited,
      );
      if (lastWord >= 0) return lastWord;
    }
  }

  if (word.skippable) {
    return consumeFrom(words, wordIndex + 1, query, offset, visited);
  }

  return -1;
}

/**
 * Whether `queryKey` (from `shorthandKey`) is a shorthand for `title`.
 *
 * The query is consumed by walking consecutive title words and taking a prefix
 * of each, so one rule covers acronyms (`cod`), truncations (`civ 6`) and
 * space-stripped titles (`half life`). Numbers must be typed in full; words
 * match by prefix. The run may start at any word, which is what lets `lotr`
 * reach `The Lord of the Rings`.
 */
export function matchTitleShorthand(
  title: string,
  queryKey: string,
): TitleShorthandMatch {
  if (queryKey.length < MIN_QUERY_LENGTH) return null;
  const words = splitTitleIntoWords(title);
  if (words.length === 0) return null;

  for (let startIndex = 0; startIndex < words.length; startIndex++) {
    const lastWord = consumeFrom(
      words,
      startIndex,
      queryKey,
      0,
      new Set<number>(),
    );
    if (lastWord < 0) continue;
    return startIndex === 0 && lastWord === words.length - 1
      ? "whole"
      : "partial";
  }
  return null;
}
