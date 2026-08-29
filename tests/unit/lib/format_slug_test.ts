import { assertEquals } from "@std/assert";
import {
  formatSlugFromName,
  nameFromSlug,
} from "../../../src/lib/formatSlug.ts";

Deno.test("nameFromSlug: hyphens become spaces", () => {
  assertEquals(nameFromSlug("video-games"), "video games");
});

Deno.test("nameFromSlug: runs of hyphens collapse to one space", () => {
  assertEquals(nameFromSlug("rock--and---roll"), "rock and roll");
});

Deno.test("nameFromSlug: leading and trailing hyphens do not leave stray spaces", () => {
  assertEquals(nameFromSlug("-nintendo-"), "nintendo");
});

Deno.test("nameFromSlug: a single-word slug is returned unchanged", () => {
  assertEquals(nameFromSlug("nintendo"), "nintendo");
});

Deno.test("nameFromSlug: round-trips a slug built from a display name", () => {
  // Not an exact inverse — casing is the caller's job — but no separator is lost.
  assertEquals(nameFromSlug(formatSlugFromName("Video Games")), "video games");
});
