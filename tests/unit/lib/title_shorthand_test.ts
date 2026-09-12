import { assertEquals } from "@std/assert";
import { normalizeAnswer } from "../../../src/lib/normalize.ts";
import {
  matchTitleShorthand,
  shorthandKey,
} from "../../../src/lib/titleShorthand.ts";

/** Reads the way a player types: raw query in, match out. */
function match(title: string, query: string) {
  return matchTitleShorthand(title, shorthandKey(query));
}

Deno.test("matchTitleShorthand: the abbreviations from the issue all resolve", () => {
  assertEquals(match("Call of Duty", "COD"), "whole");
  assertEquals(match("Team Fortress 2", "TF2"), "whole");
  assertEquals(match("Grand Theft Auto IV", "GTA 4"), "whole");
  assertEquals(match("Counter-Strike: Global Offensive", "CSGO"), "whole");
  assertEquals(match("Civilization VI", "Civ 6"), "whole");
  assertEquals(match("RollerCoaster Tycoon", "RCT"), "whole");
  assertEquals(match("Command & Conquer", "CnC"), "whole");
});

Deno.test("matchTitleShorthand: a truncated first word counts, not just an initial", () => {
  assertEquals(match("Civilization VI", "civ 6"), "whole");
  assertEquals(match("Civilization VI", "civilization 6"), "whole");
  assertEquals(match("Metal Gear Solid V", "metal gear solid 5"), "whole");
  assertEquals(match("Metal Gear Solid V", "mgs5"), "whole");
});

Deno.test("matchTitleShorthand: words are consumed consecutively, never skipped", () => {
  // Dropping "Solid" would make the rule loose enough to match half the pool.
  assertEquals(match("Metal Gear Solid V", "metal gear 5"), null);
  assertEquals(match("Call of Duty", "cd"), null);
});

Deno.test("matchTitleShorthand: stripping spaces bridges a punctuated title", () => {
  // normalizeAnswer deletes the hyphen without leaving a separator, so the
  // typed "half life" is no substring of the normalized title.
  assertEquals(normalizeAnswer("Half-Life"), "halflife");
  assertEquals(match("Half-Life", "half life"), "whole");
  assertEquals(match("Half-Life 2", "half life 2"), "whole");
  assertEquals(match("WALL·E", "walle"), "whole");
});

Deno.test("matchTitleShorthand: words come from the raw title, not the normalized one", () => {
  // Normalization would fuse Counter-Strike into one word and offer "cgo".
  assertEquals(
    normalizeAnswer("Counter-Strike: Global Offensive"),
    "counterstrike global offensive",
  );
  assertEquals(match("Counter-Strike: Global Offensive", "csgo"), "whole");
  assertEquals(match("Spider-Man", "sm"), "whole");
  assertEquals(match("Star Wars: Episode IV", "swe4"), "whole");
});

Deno.test("matchTitleShorthand: camelCase splits and an all-caps word does not", () => {
  assertEquals(match("RollerCoaster Tycoon", "rct"), "whole");
  assertEquals(match("FIFA 23", "fifa23"), "whole");
  assertEquals(match("NBA 2K21", "nba2k21"), "whole");
});

Deno.test("matchTitleShorthand: a possessive fuses to its stem", () => {
  assertEquals(match("Assassin's Creed", "ac"), "whole");
  assertEquals(match("Uncharted: Drake's Fortune", "udf"), "whole");
  assertEquals(match("Baldur's Gate 3", "bg3"), "whole");
});

Deno.test("matchTitleShorthand: an ampersand reads as n, as itself, or as nothing", () => {
  assertEquals(match("Command & Conquer", "cnc"), "whole");
  assertEquals(match("Command & Conquer", "c&c"), "whole");
  assertEquals(match("Command & Conquer", "cc"), "whole");
  assertEquals(match("Ratchet & Clank", "rnc"), "whole");
});

Deno.test("matchTitleShorthand: a roman numeral also answers to its arabic value", () => {
  assertEquals(match("Grand Theft Auto IV", "gta iv"), "whole");
  assertEquals(match("Grand Theft Auto IV", "gta4"), "whole");
  assertEquals(match("Final Fantasy VII", "ffvii"), "whole");
  assertEquals(match("Final Fantasy VII", "ff7"), "whole");
});

Deno.test("matchTitleShorthand: an arabic numeral also answers to its roman form", () => {
  assertEquals(match("Civilization 6", "civ vi"), "whole");
  assertEquals(match("Portal 2", "p ii"), "whole");
});

Deno.test("matchTitleShorthand: a number must be typed in full", () => {
  // "1" must not reach XIII through the leading digit of 13.
  assertEquals(match("Final Fantasy XIII", "ff1"), null);
  assertEquals(match("Final Fantasy XIII", "ff13"), "whole");
  assertEquals(match("Cyberpunk 2077", "cyberpunk 2"), null);
  assertEquals(match("Cyberpunk 2077", "cyberpunk 2077"), "whole");
  assertEquals(match("Cyberpunk 2077", "c2077"), "whole");
});

Deno.test("matchTitleShorthand: a leading capital that only looks roman stays a word", () => {
  assertEquals(match("I Am Legend", "ial"), "whole");
  assertEquals(match("V for Vendetta", "vfv"), "whole");
  assertEquals(match("X-Men", "xm"), "whole");
});

Deno.test("matchTitleShorthand: the run may start after the first word", () => {
  assertEquals(match("The Lord of the Rings", "lotr"), "partial");
  assertEquals(
    match("The Legend of Zelda: Breath of the Wild", "botw"),
    "partial",
  );
  assertEquals(match("Call of Duty: Modern Warfare", "mw"), "partial");
});

Deno.test("matchTitleShorthand: covering the whole title outranks covering part of it", () => {
  assertEquals(match("Call of Duty", "cod"), "whole");
  assertEquals(match("Call of Duty: Modern Warfare", "cod"), "partial");
});

Deno.test("matchTitleShorthand: an unrelated query misses", () => {
  assertEquals(match("Moana", "cod"), null);
  assertEquals(match("Animal Crossing", "csgo"), null);
  assertEquals(match("Frozen", "civ6"), null);
});

Deno.test("matchTitleShorthand: a one-character query never matches", () => {
  assertEquals(match("Call of Duty", "c"), null);
  assertEquals(match("Call of Duty", " c "), null);
});

Deno.test("matchTitleShorthand: an empty query never matches", () => {
  assertEquals(match("Call of Duty", ""), null);
  assertEquals(match("Call of Duty", "   "), null);
  assertEquals(match("Call of Duty", "!?"), null);
});

Deno.test("matchTitleShorthand: a title with no words never matches", () => {
  assertEquals(match("", "cod"), null);
  assertEquals(match("   ", "cod"), null);
  assertEquals(match("...", "cod"), null);
  assertEquals(match(" - ", "cod"), null);
});

Deno.test("matchTitleShorthand: surrounding separators are ignored", () => {
  assertEquals(match("  - Arma 3 - ", "a3"), match("Arma 3", "a3"));
  assertEquals(match("Arma 3", "a3"), "whole");
});

Deno.test("shorthandKey: folds case, accents and punctuation, and drops spaces", () => {
  assertEquals(shorthandKey("GTA 4"), "gta4");
  assertEquals(shorthandKey("  Cod! "), "cod");
  assertEquals(shorthandKey("C & C"), "c&c");
  assertEquals(shorthandKey("Pokémon Red"), "pokemonred");
  assertEquals(shorthandKey(""), "");
  assertEquals(shorthandKey("   "), "");
});
