import { assertEquals } from "@std/assert";

import {
  filterUnlinkedAudioUrls,
  type MusicDirEntry,
  sortAudioEntriesByNewestFirst,
} from "../../../src/lib/listMusicDir.ts";

const MUSIC_FILES = [
  "data/music/alpha.mp3",
  "data/music/beta.flac",
  "data/music/gamma.ogg",
];

Deno.test("filterUnlinkedAudioUrls keeps every file when nothing is linked", () => {
  assertEquals(filterUnlinkedAudioUrls(MUSIC_FILES, []), MUSIC_FILES);
});

Deno.test("filterUnlinkedAudioUrls drops an exactly matching linked path", () => {
  assertEquals(
    filterUnlinkedAudioUrls(MUSIC_FILES, ["data/music/beta.flac"]),
    ["data/music/alpha.mp3", "data/music/gamma.ogg"],
  );
});

Deno.test("filterUnlinkedAudioUrls normalizes separators, leading slashes and whitespace on stored paths", () => {
  assertEquals(
    filterUnlinkedAudioUrls(MUSIC_FILES, [
      "data\\music\\alpha.mp3",
      "/data/music/beta.flac",
      "  data/music/gamma.ogg  ",
    ]),
    [],
  );
});

Deno.test("filterUnlinkedAudioUrls ignores a stored remote URL", () => {
  assertEquals(
    filterUnlinkedAudioUrls(MUSIC_FILES, [
      "https://cdn.example.test/data/music/alpha.mp3",
    ]),
    MUSIC_FILES,
  );
});

Deno.test("filterUnlinkedAudioUrls matches case-sensitively", () => {
  // Deliberate: the track form handlers gate writes on an exact set membership
  // check, so a looser comparison here would let the two disagree.
  assertEquals(
    filterUnlinkedAudioUrls(MUSIC_FILES, ["data/music/ALPHA.mp3"]),
    MUSIC_FILES,
  );
});

Deno.test("filterUnlinkedAudioUrls returns an empty list for an empty directory", () => {
  assertEquals(filterUnlinkedAudioUrls([], ["data/music/alpha.mp3"]), []);
});

Deno.test("sortAudioEntriesByNewestFirst orders by modification time descending", () => {
  const entries: MusicDirEntry[] = [
    { audioUrl: "data/music/old.mp3", modifiedAtMs: 1_000 },
    { audioUrl: "data/music/newest.mp3", modifiedAtMs: 3_000 },
    { audioUrl: "data/music/middle.mp3", modifiedAtMs: 2_000 },
  ];
  assertEquals(
    sortAudioEntriesByNewestFirst(entries).map((entry) => entry.audioUrl),
    [
      "data/music/newest.mp3",
      "data/music/middle.mp3",
      "data/music/old.mp3",
    ],
  );
});

Deno.test("sortAudioEntriesByNewestFirst puts unknown modification times last", () => {
  const entries: MusicDirEntry[] = [
    { audioUrl: "data/music/unknown.mp3", modifiedAtMs: null },
    { audioUrl: "data/music/known.mp3", modifiedAtMs: 1 },
  ];
  assertEquals(
    sortAudioEntriesByNewestFirst(entries).map((entry) => entry.audioUrl),
    ["data/music/known.mp3", "data/music/unknown.mp3"],
  );
});

Deno.test("sortAudioEntriesByNewestFirst breaks ties on the path", () => {
  const entries: MusicDirEntry[] = [
    { audioUrl: "data/music/b.mp3", modifiedAtMs: 5 },
    { audioUrl: "data/music/a.mp3", modifiedAtMs: 5 },
    { audioUrl: "data/music/d.mp3", modifiedAtMs: null },
    { audioUrl: "data/music/c.mp3", modifiedAtMs: null },
  ];
  assertEquals(
    sortAudioEntriesByNewestFirst(entries).map((entry) => entry.audioUrl),
    [
      "data/music/a.mp3",
      "data/music/b.mp3",
      "data/music/c.mp3",
      "data/music/d.mp3",
    ],
  );
});

Deno.test("sortAudioEntriesByNewestFirst does not mutate its input", () => {
  const entries: MusicDirEntry[] = [
    { audioUrl: "data/music/old.mp3", modifiedAtMs: 1 },
    { audioUrl: "data/music/new.mp3", modifiedAtMs: 2 },
  ];
  sortAudioEntriesByNewestFirst(entries);
  assertEquals(entries.map((entry) => entry.audioUrl), [
    "data/music/old.mp3",
    "data/music/new.mp3",
  ]);
});
