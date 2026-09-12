import { assertEquals } from "@std/assert";
import { guessMatchesSuggestionPool } from "../src/lib/guess_match.ts";

Deno.test("guessMatchesSuggestionPool: empty and whitespace-only are false", () => {
  assertEquals(guessMatchesSuggestionPool("", ["Frozen"]), false);
  assertEquals(guessMatchesSuggestionPool("   ", ["Frozen"]), false);
  assertEquals(guessMatchesSuggestionPool("\t\n", ["Frozen"]), false);
});

Deno.test("guessMatchesSuggestionPool: no match", () => {
  assertEquals(
    guessMatchesSuggestionPool("not a title", ["Frozen", "Moana"]),
    false,
  );
  assertEquals(guessMatchesSuggestionPool("Froz", ["Frozen"]), false);
});

Deno.test("guessMatchesSuggestionPool: case and punctuation parity with normalizeAnswer", () => {
  assertEquals(guessMatchesSuggestionPool("MOANA", ["Moana", "Other"]), true);
  assertEquals(
    guessMatchesSuggestionPool("  moana  ", ["Moana"]),
    true,
  );
  assertEquals(
    guessMatchesSuggestionPool("WALL E", ["Wall·E"]),
    true,
  );
});

Deno.test("guessMatchesSuggestionPool: duplicate pool titles still match", () => {
  assertEquals(
    guessMatchesSuggestionPool("Same", ["Same", "Same", "Other"]),
    true,
  );
});

Deno.test("guessMatchesSuggestionPool: empty suggestions list", () => {
  assertEquals(guessMatchesSuggestionPool("Anything", []), false);
});

Deno.test("guessMatchesSuggestionPool: diacritic-insensitive", () => {
  assertEquals(guessMatchesSuggestionPool("pokemon", ["Pokémon"]), true);
  assertEquals(guessMatchesSuggestionPool("Pokémon", ["Pokemon"]), true);
  assertEquals(guessMatchesSuggestionPool("beyonce", ["Beyoncé"]), true);
});

Deno.test("guessMatchesSuggestionPool: a shorthand is not a submittable answer", () => {
  // Shorthand widens discovery only. The player still commits the real title,
  // so the submit gate and scoring keep comparing whole titles.
  assertEquals(guessMatchesSuggestionPool("cod", ["Call of Duty"]), false);
  assertEquals(
    guessMatchesSuggestionPool("csgo", ["Counter-Strike: Global Offensive"]),
    false,
  );
  assertEquals(
    guessMatchesSuggestionPool("gta4", ["Grand Theft Auto IV"]),
    false,
  );
  assertEquals(guessMatchesSuggestionPool("half life", ["Half-Life"]), false);
});
