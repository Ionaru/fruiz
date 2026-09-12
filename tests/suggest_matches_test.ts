import { assertEquals } from "@std/assert";
import { suggestMatches } from "../src/lib/guess_match.ts";

Deno.test("suggestMatches: empty and whitespace-only return []", () => {
  assertEquals(suggestMatches("", ["Frozen", "Moana"], 20), []);
  assertEquals(suggestMatches("   ", ["Frozen", "Moana"], 20), []);
  assertEquals(suggestMatches("\t\n", ["Frozen", "Moana"], 20), []);
});

Deno.test("suggestMatches: exact match ranks before startsWith and contains", () => {
  const pool = ["Frozen II", "Frozen", "Unfrozen Heart"];
  assertEquals(suggestMatches("frozen", pool, 20), [
    "Frozen",
    "Frozen II",
    "Unfrozen Heart",
  ]);
});

Deno.test("suggestMatches: startsWith ranks before contains", () => {
  const pool = ["The Hunt for Red", "Red October", "Deep Red"];
  assertEquals(suggestMatches("red", pool, 20), [
    "Red October",
    "The Hunt for Red",
    "Deep Red",
  ]);
});

Deno.test("suggestMatches: case and punctuation parity with normalizeAnswer", () => {
  assertEquals(suggestMatches("WALL E", ["Wall·E", "Moana"], 20), ["Wall·E"]);
  assertEquals(suggestMatches("  moana  ", ["Moana"], 20), ["Moana"]);
  assertEquals(
    suggestMatches("frozen!", ["FROZEN", "Batman"], 20),
    ["FROZEN"],
  );
});

Deno.test("suggestMatches: no match returns []", () => {
  assertEquals(suggestMatches("zzz", ["Frozen", "Moana"], 20), []);
});

Deno.test("suggestMatches: honors limit", () => {
  const pool = ["Apple A", "Apple B", "Apple C", "Apple D", "Apple E"];
  assertEquals(suggestMatches("apple", pool, 3), [
    "Apple A",
    "Apple B",
    "Apple C",
  ]);
  assertEquals(suggestMatches("apple", pool, 0), []);
});

Deno.test("suggestMatches: stable within same rank (input order preserved)", () => {
  const pool = ["Banana Split", "Banana Bread", "Banana Milkshake"];
  assertEquals(suggestMatches("banana", pool, 20), [
    "Banana Split",
    "Banana Bread",
    "Banana Milkshake",
  ]);
});

Deno.test("suggestMatches: duplicate titles are both returned (filtering is not de-duping)", () => {
  assertEquals(suggestMatches("same", ["Same", "Same", "Other"], 20), [
    "Same",
    "Same",
  ]);
});

Deno.test("suggestMatches: empty suggestions pool returns []", () => {
  assertEquals(suggestMatches("anything", [], 20), []);
});

Deno.test("suggestMatches: diacritic-insensitive", () => {
  assertEquals(suggestMatches("poke", ["Pokémon", "Poker Face"], 20), [
    "Pokémon",
    "Poker Face",
  ]);
  assertEquals(suggestMatches("pokemon", ["Pokémon"], 20), ["Pokémon"]);
  assertEquals(suggestMatches("amélie", ["Amelie"], 20), ["Amelie"]);
});

Deno.test("suggestMatches: a shorthand finds a title it shares no substring with", () => {
  const pool = ["Call of Duty", "Counter-Strike: Global Offensive", "Moana"];
  assertEquals(suggestMatches("csgo", pool, 20), [
    "Counter-Strike: Global Offensive",
  ]);
  assertEquals(suggestMatches("civ 6", ["Civilization VI", "Moana"], 20), [
    "Civilization VI",
  ]);
  assertEquals(suggestMatches("half life", ["Half-Life", "Moana"], 20), [
    "Half-Life",
  ]);
});

Deno.test("suggestMatches: literal title matches rank before shorthand matches", () => {
  const pool = ["Call of Duty", "Codename Kids Next Door"];
  assertEquals(suggestMatches("cod", pool, 20), [
    "Codename Kids Next Door",
    "Call of Duty",
  ]);
});

Deno.test("suggestMatches: a shorthand covering the whole title ranks first", () => {
  const pool = ["Call of Duty: Modern Warfare", "Call of Duty"];
  assertEquals(suggestMatches("cod", pool, 20), [
    "Call of Duty",
    "Call of Duty: Modern Warfare",
  ]);
});

Deno.test("suggestMatches: shorthand matches are stable and honor the limit", () => {
  const pool = [
    "Grand Theft Auto IV",
    "Grand Theft Auto V",
    "Grand Theft Auto: San Andreas",
  ];
  assertEquals(suggestMatches("gta", pool, 2), [
    "Grand Theft Auto IV",
    "Grand Theft Auto V",
  ]);
});

Deno.test("suggestMatches: a typed arabic numeral meets a roman one", () => {
  assertEquals(suggestMatches("GTA 4", ["Grand Theft Auto IV"], 20), [
    "Grand Theft Auto IV",
  ]);
});

Deno.test("suggestMatches: a one-character query returns no shorthand-only hits", () => {
  // "4" is no substring of "grand theft auto iv", so only the shorthand tier
  // could return it — and a single character is below its floor.
  assertEquals(suggestMatches("4", ["Grand Theft Auto IV"], 20), []);
  assertEquals(suggestMatches("gta4", ["Grand Theft Auto IV"], 20), [
    "Grand Theft Auto IV",
  ]);
});

Deno.test("suggestMatches: a shorthand for nothing in the pool still returns []", () => {
  assertEquals(suggestMatches("csgo", ["Moana", "Frozen"], 20), []);
});
