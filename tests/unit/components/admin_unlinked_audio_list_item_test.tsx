import { assertEquals, assertFalse, assertStringIncludes } from "@std/assert";
import { render } from "preact-render-to-string";
import { AdminUnlinkedAudioListItem } from "../../../src/components/admin/AdminUnlinkedAudioListItem.tsx";

function markup(audioUrl: string): string {
  return render(<AdminUnlinkedAudioListItem audioUrl={audioUrl} />);
}

/** The `href` of the row's single link. */
function destination(html: string): string {
  return html.match(/<a\s[^>]*href="([^"]*)"/)?.[1] ?? "";
}

Deno.test("row links to the new-track form with the file preselected", () => {
  assertEquals(
    destination(markup("data/music/some-track.mp3")),
    "/admin/tracks/new?audio=data%2Fmusic%2Fsome-track.mp3",
  );
});

Deno.test("row percent-encodes a path with spaces and specials", () => {
  const href = destination(markup("data/music/a song & more.mp3"));
  assertEquals(
    href,
    "/admin/tracks/new?audio=data%2Fmusic%2Fa%20song%20%26%20more.mp3",
  );
  // The encoded value must survive as one query parameter.
  const parsed = new URL(href, "https://example.test");
  assertEquals(
    parsed.searchParams.get("audio"),
    "data/music/a song & more.mp3",
  );
});

Deno.test("row shows the filename with its extension, not the directory", () => {
  const html = markup("data/music/some-track.mp3");
  assertStringIncludes(html, ">some-track.mp3<");
  // The full path only ever appears inside the href, never as visible text.
  assertFalse(html.includes(">data/music/some-track.mp3<"));
});

Deno.test("row keeps an accessible label at every width", () => {
  const html = markup("data/music/some-track.mp3");
  assertStringIncludes(html, "Add track");
  assertStringIncludes(html, "sr-only sm:not-sr-only");
});

Deno.test("row distinguishes two files that differ only by extension", () => {
  const flac = markup("data/music/twin.flac");
  const mp3 = markup("data/music/twin.mp3");
  assertStringIncludes(flac, ">twin.flac<");
  assertStringIncludes(mp3, ">twin.mp3<");
  assertFalse(destination(flac) === destination(mp3));
});
