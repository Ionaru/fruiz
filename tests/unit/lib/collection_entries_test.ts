import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  type CollectionEntry,
  countLockedEntries,
  filterCollectionEntries,
  groupIntoLetterSections,
  groupLetterForTitle,
  matchesCollectionSearch,
  toCollectionEntries,
} from "../../../src/lib/collectionEntries.ts";

function collected(
  title: string,
  categories: string[] = ["Video Games"],
): CollectionEntry {
  return {
    kind: "collected",
    id: `id-${title}`,
    title,
    letter: groupLetterForTitle(title),
    categories,
    playbackGainDb: null,
    playbackGainSourceSize: null,
    playbackGainSourceMtimeMs: null,
  };
}

function locked(
  letter: string,
  categories: string[] = ["Video Games"],
): CollectionEntry {
  return { kind: "locked", letter, categories };
}

Deno.test("groupLetterForTitle: uppercases the first character", () => {
  assertEquals(groupLetterForTitle("Angry Birds"), "A");
  assertEquals(groupLetterForTitle("banjo-Kazooie"), "B");
});

Deno.test("groupLetterForTitle: digits stay their own divider", () => {
  assertEquals(groupLetterForTitle("1-2-Switch"), "1");
  assertEquals(groupLetterForTitle("7 Days to Die"), "7");
});

Deno.test("groupLetterForTitle: leading whitespace is ignored", () => {
  assertEquals(groupLetterForTitle("  Arma 3"), "A");
});

Deno.test("groupLetterForTitle: a blank title still lands somewhere", () => {
  assertEquals(groupLetterForTitle(""), "#");
  assertEquals(groupLetterForTitle("   "), "#");
});

Deno.test("matchesCollectionSearch: an empty query matches everything", () => {
  assertEquals(matchesCollectionSearch("Arma 3", ""), true);
  assertEquals(matchesCollectionSearch("Arma 3", "   "), true);
});

Deno.test("matchesCollectionSearch: matches on a substring, case-insensitively", () => {
  assertEquals(matchesCollectionSearch("Animal Crossing", "crossing"), true);
  assertEquals(matchesCollectionSearch("Animal Crossing", "ANIMAL"), true);
  assertEquals(matchesCollectionSearch("Animal Crossing", "banjo"), false);
});

Deno.test("matchesCollectionSearch: ignores punctuation and accents, like guess scoring", () => {
  assertEquals(
    matchesCollectionSearch("Assassin's Creed 2", "assassins"),
    true,
  );
  assertEquals(matchesCollectionSearch("Pokémon Red", "pokemon"), true);
});

Deno.test("filterCollectionEntries: no filter keeps collected and locked alike", () => {
  const entries = [collected("Arma 3"), locked("A")];
  assertEquals(
    filterCollectionEntries(entries, { category: null, query: "" }).length,
    2,
  );
});

Deno.test("filterCollectionEntries: category narrows both kinds", () => {
  const entries = [
    collected("Banjo-Kazooie", ["Video Games", "Nintendo"]),
    collected("Arma 3", ["Video Games"]),
    locked("A", ["Nintendo"]),
    locked("B", ["Video Games"]),
  ];
  const kept = filterCollectionEntries(entries, {
    category: "Nintendo",
    query: "",
  });
  assertEquals(kept.length, 2);
  assertEquals(
    kept[0]?.kind === "collected" ? kept[0].title : null,
    "Banjo-Kazooie",
  );
  assertEquals(kept[1]?.kind, "locked");
});

Deno.test("filterCollectionEntries: an active search drops locked slots", () => {
  const entries = [collected("Arma 3"), locked("A"), collected("Angry Birds")];
  const kept = filterCollectionEntries(entries, { category: null, query: "a" });
  assertEquals(kept.every((entry) => entry.kind === "collected"), true);
  assertEquals(kept.length, 2);
});

Deno.test("filterCollectionEntries: search and category compose", () => {
  const entries = [
    collected("Animal Crossing", ["Nintendo"]),
    collected("Arma 3", ["Video Games"]),
  ];
  const kept = filterCollectionEntries(entries, {
    category: "Nintendo",
    query: "a",
  });
  assertEquals(kept.length, 1);
  assertEquals(
    kept[0]?.kind === "collected" ? kept[0].title : null,
    "Animal Crossing",
  );
});

Deno.test("groupIntoLetterSections: consecutive entries share one divider", () => {
  const sections = groupIntoLetterSections([
    collected("1-2-Switch"),
    collected("Angry Birds"),
    collected("Arma 3"),
    collected("Banjo-Kazooie"),
  ]);
  assertEquals(sections.map((section) => section.letter), ["1", "A", "B"]);
  assertEquals(sections.map((section) => section.entries.length), [1, 2, 1]);
});

Deno.test("groupIntoLetterSections: locked slots join the letter they sort under", () => {
  const sections = groupIntoLetterSections([
    collected("Angry Birds"),
    locked("A"),
    collected("Arma 3"),
  ]);
  assertEquals(sections.length, 1);
  assertEquals(sections[0]?.entries.length, 3);
  assertEquals(sections[0]?.entries[1]?.kind, "locked");
});

Deno.test("groupIntoLetterSections: an empty catalog yields no sections", () => {
  assertEquals(groupIntoLetterSections([]), []);
});

Deno.test("countLockedEntries: counts only what is still missing", () => {
  assertEquals(
    countLockedEntries([collected("Arma 3"), locked("A"), locked("B")]),
    2,
  );
  assertEquals(countLockedEntries([collected("Arma 3")]), 0);
});

Deno.test("groupLetterForTitle: accents fold, so a letter's run stays contiguous", () => {
  // `localeCompare` files "Ángel" among the A's; an unfolded "Á" divider would
  // split that run into "A", "Á", "A".
  assertEquals(groupLetterForTitle("Ángel"), "A");
  assertEquals(groupLetterForTitle("Ōkami"), "O");
  assertEquals(groupLetterForTitle("Étude"), "E");
});

Deno.test("groupIntoLetterSections: an accented title does not open its own divider", () => {
  const sections = groupIntoLetterSections([
    collected("Angel"),
    collected("Ángel"),
    collected("Arma 3"),
  ]);
  assertEquals(sections.length, 1);
  assertEquals(sections[0]?.letter, "A");
  assertEquals(sections[0]?.entries.length, 3);
});

function catalogTrack(
  title: string,
  collected: boolean,
  categories: string[] = ["Video Games"],
) {
  return {
    trackId: `id-${title}`,
    title,
    collected,
    categories,
    playbackGainDb: -3,
    playbackGainSourceSize: 100,
    playbackGainSourceMtimeMs: 200,
  };
}

Deno.test("toCollectionEntries: a collected track keeps everything the row plays with", () => {
  const [entry] = toCollectionEntries([catalogTrack("Arma 3", true)]);
  assertEquals(entry?.kind, "collected");
  assert(entry !== undefined && entry.kind === "collected");
  assertEquals(entry.title, "Arma 3");
  assertEquals(entry.id, "id-Arma 3");
  assertEquals(entry.letter, "A");
  assertEquals(entry.playbackGainDb, -3);
});

Deno.test("toCollectionEntries: a locked slot keeps its place but loses its identity", () => {
  const [entry] = toCollectionEntries([catalogTrack("Banjo-Kazooie", false)]);
  assert(entry !== undefined && entry.kind === "locked");
  assertEquals(entry.letter, "B");
  assertEquals(entry.categories, ["Video Games"]);
  assert(!Object.hasOwn(entry, "title"));
  assert(!Object.hasOwn(entry, "id"));
});

Deno.test("toCollectionEntries: no uncollected title survives serialization", () => {
  // The page's privacy boundary: the quiz asks for these titles, so shipping
  // one for a track the player has not collected would hand over the answer.
  const serialized = JSON.stringify(toCollectionEntries([
    catalogTrack("Angry Birds", true),
    catalogTrack("Secret Of Mana", false),
    catalogTrack("Zelda", false),
  ]));
  assertStringIncludes(serialized, "Angry Birds");
  assert(
    !serialized.includes("Secret Of Mana"),
    "an uncollected title reached the payload",
  );
  assert(
    !serialized.includes("Zelda"),
    "an uncollected title reached the payload",
  );
});

Deno.test("toCollectionEntries: audioUrl is never part of the payload", () => {
  const serialized = JSON.stringify(
    toCollectionEntries([catalogTrack("Arma 3", true)]),
  );
  assert(!serialized.includes("audioUrl"));
  assert(!serialized.includes(".mp3"));
});

Deno.test("toCollectionEntries: input order is preserved, so locked slots keep their position", () => {
  const entries = toCollectionEntries([
    catalogTrack("Angry Birds", true),
    catalogTrack("Animal Crossing", false),
    catalogTrack("Arma 3", true),
  ]);
  assertEquals(entries.map((entry) => entry.kind), [
    "collected",
    "locked",
    "collected",
  ]);
});
