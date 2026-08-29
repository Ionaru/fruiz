import { assert, assertEquals } from "@std/assert";

import {
  basenameFromAudioUrl,
  filenameFromAudioUrl,
  trackTitleFromAudioUrl,
} from "../../../src/lib/audioFilePath.ts";

Deno.test("filenameFromAudioUrl strips directory and extension", () => {
  assertEquals(filenameFromAudioUrl("data/music/some-track.mp3"), "some-track");
  assertEquals(filenameFromAudioUrl("data/music/another.flac"), "another");
});

Deno.test("filenameFromAudioUrl normalizes backslash separators", () => {
  assertEquals(
    filenameFromAudioUrl("data\\music\\windows-song.m4a"),
    "windows-song",
  );
});

Deno.test("filenameFromAudioUrl handles a bare filename", () => {
  assertEquals(filenameFromAudioUrl("solo.ogg"), "solo");
});

Deno.test("filenameFromAudioUrl keeps a name that has no extension", () => {
  assertEquals(filenameFromAudioUrl("data/music/no-extension"), "no-extension");
});

Deno.test("filenameFromAudioUrl preserves a leading-dot filename", () => {
  // No directory component and a leading dot → treat the whole thing as the name.
  assertEquals(filenameFromAudioUrl(".hidden"), ".hidden");
});

Deno.test("filenameFromAudioUrl drops query and hash on remote URLs", () => {
  assertEquals(
    filenameFromAudioUrl("https://cdn.example.test/audio/remote-song.mp3?v=2"),
    "remote-song",
  );
});

Deno.test("filenameFromAudioUrl never leaks a path separator", () => {
  for (
    const url of [
      "data/music/some-track.mp3",
      "data\\music\\windows-song.m4a",
      "https://cdn.example.test/audio/remote-song.mp3?v=2",
    ]
  ) {
    const name = filenameFromAudioUrl(url);
    assert(!name.includes("/"), `unexpected "/" in ${name}`);
    assert(!name.includes("\\"), `unexpected "\\" in ${name}`);
  }
});

Deno.test("basenameFromAudioUrl keeps the extension", () => {
  assertEquals(
    basenameFromAudioUrl("data/music/some-track.mp3"),
    "some-track.mp3",
  );
  assertEquals(
    basenameFromAudioUrl("data/music/same-name.flac"),
    "same-name.flac",
  );
});

Deno.test("basenameFromAudioUrl normalizes backslash separators", () => {
  assertEquals(
    basenameFromAudioUrl("data\\music\\windows-song.m4a"),
    "windows-song.m4a",
  );
});

Deno.test("basenameFromAudioUrl handles a bare filename", () => {
  assertEquals(basenameFromAudioUrl("solo.ogg"), "solo.ogg");
});

Deno.test("basenameFromAudioUrl drops query and hash on remote URLs", () => {
  assertEquals(
    basenameFromAudioUrl("https://cdn.example.test/audio/remote-song.mp3?v=2"),
    "remote-song.mp3",
  );
});

Deno.test("basenameFromAudioUrl never leaks a path separator", () => {
  for (
    const url of [
      "data/music/some-track.mp3",
      "data\\music\\windows-song.m4a",
      "https://cdn.example.test/audio/remote-song.mp3?v=2",
    ]
  ) {
    const name = basenameFromAudioUrl(url);
    assert(!name.includes("/"), `unexpected "/" in ${name}`);
    assert(!name.includes("\\"), `unexpected "\\" in ${name}`);
  }
});

Deno.test("trackTitleFromAudioUrl humanizes a filename", () => {
  assertEquals(
    trackTitleFromAudioUrl("data/music/some_great-song.mp3"),
    "some great song",
  );
  assertEquals(
    trackTitleFromAudioUrl("data/music/Hello  World.flac"),
    "Hello World",
  );
});

Deno.test("trackTitleFromAudioUrl strips the directory and extension", () => {
  assertEquals(trackTitleFromAudioUrl("data/music/nested/track.ogg"), "track");
});

Deno.test("trackTitleFromAudioUrl falls back to the filename when nothing is left", () => {
  assertEquals(trackTitleFromAudioUrl("data/music/---.mp3"), "---");
});

Deno.test("trackTitleFromAudioUrl returns an empty string for an empty path", () => {
  assertEquals(trackTitleFromAudioUrl(""), "");
});
