import { assertEquals } from "@std/assert";
import { suggestMatches } from "../../../src/lib/guess_match.ts";
import { toTitleSuggestionPool } from "../../../src/lib/titleSuggestionPool.ts";

Deno.test("toTitleSuggestionPool: orders titles alphabetically", () => {
  assertEquals(
    toTitleSuggestionPool(["Half-Life 2", "Age of Empires II", "Doom"]),
    ["Age of Empires II", "Doom", "Half-Life 2"],
  );
});

Deno.test("toTitleSuggestionPool: a title appears once", () => {
  assertEquals(
    toTitleSuggestionPool(["Tetris", "Portal", "Tetris"]),
    ["Portal", "Tetris"],
  );
});

Deno.test("toTitleSuggestionPool: case and accents file where a reader expects", () => {
  // SQLite's binary collation would put every capital first ("Zelda" before
  // "flower") and file "Ángel" after "Zelda".
  assertEquals(
    toTitleSuggestionPool(["Zelda", "flower", "Ángel"]),
    ["Ángel", "flower", "Zelda"],
  );
});

Deno.test("toTitleSuggestionPool: the input order never shows through", () => {
  const titles = ["Rocket League", "Braid", "Limbo", "Celeste"];
  const sorted = toTitleSuggestionPool(titles);
  assertEquals(toTitleSuggestionPool([...titles].reverse()), sorted);
  assertEquals(sorted, ["Braid", "Celeste", "Limbo", "Rocket League"]);
});

Deno.test("toTitleSuggestionPool: both dropdowns rank a category the same way", () => {
  // The bug from issue #40: the suggestion page fed the autocomplete the
  // category tracks endpoint's difficulty-then-title order, so the sequel
  // whose track is easy jumped ahead of the one whose track is hard.
  const quizPool = toTitleSuggestionPool([
    "Command & Conquer: Red Alert",
    "Command & Conquer: Red Alert 2",
    "Command & Conquer: Red Alert 3",
  ]);
  const suggestionPagePool = toTitleSuggestionPool([
    "Command & Conquer: Red Alert",
    "Command & Conquer: Red Alert 3",
    "Command & Conquer: Red Alert 2",
  ]);

  assertEquals(suggestionPagePool, quizPool);
  assertEquals(
    suggestMatches("Command & Conquer: Red Alert", suggestionPagePool, 20),
    [
      "Command & Conquer: Red Alert",
      "Command & Conquer: Red Alert 2",
      "Command & Conquer: Red Alert 3",
    ],
  );
});
