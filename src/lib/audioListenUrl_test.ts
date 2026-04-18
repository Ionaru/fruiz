import { assertEquals } from "@std/assert";
import { buildListenSrc } from "./audioListenUrl.ts";

Deno.test("buildListenSrc — both null → no query string", () => {
  assertEquals(
    buildListenSrc({
      id: "abc",
      playbackGainSourceSize: null,
      playbackGainSourceMtimeMs: null,
    }),
    "/api/listen/abc",
  );
});

Deno.test("buildListenSrc — size null → no query string", () => {
  assertEquals(
    buildListenSrc({
      id: "abc",
      playbackGainSourceSize: null,
      playbackGainSourceMtimeMs: 1234,
    }),
    "/api/listen/abc",
  );
});

Deno.test("buildListenSrc — mtime null → no query string", () => {
  assertEquals(
    buildListenSrc({
      id: "abc",
      playbackGainSourceSize: 5000,
      playbackGainSourceMtimeMs: null,
    }),
    "/api/listen/abc",
  );
});

Deno.test("buildListenSrc — both present → ?v=size-mtime", () => {
  assertEquals(
    buildListenSrc({
      id: "abc",
      playbackGainSourceSize: 5000,
      playbackGainSourceMtimeMs: 1700000000000,
    }),
    "/api/listen/abc?v=5000-1700000000000",
  );
});
