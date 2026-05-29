import { assert, assertEquals } from "@std/assert";
import {
  isValidSuggestionUrl,
  validateSuggestionInput,
} from "../../../src/lib/suggestionValidation.ts";

Deno.test("isValidSuggestionUrl accepts http and https URLs", () => {
  assert(isValidSuggestionUrl("https://www.youtube.com/watch?v=abc123"));
  assert(isValidSuggestionUrl("http://youtu.be/abc123"));
  assert(isValidSuggestionUrl("  https://example.com/song  "));
});

Deno.test("isValidSuggestionUrl rejects empty, malformed, and non-http schemes", () => {
  assertEquals(isValidSuggestionUrl(""), false);
  assertEquals(isValidSuggestionUrl("   "), false);
  assertEquals(isValidSuggestionUrl("not a url"), false);
  assertEquals(isValidSuggestionUrl("ftp://example.com/song"), false);
  assertEquals(
    isValidSuggestionUrl("javascript:alert(1)"),
    false,
  );
});

Deno.test("validateSuggestionInput trims and returns the cleaned values", () => {
  const result = validateSuggestionInput(
    "  My Song  ",
    "  https://youtu.be/abc  ",
  );
  assert(result.ok);
  assertEquals(result.title, "My Song");
  assertEquals(result.youtubeUrl, "https://youtu.be/abc");
});

Deno.test("validateSuggestionInput flags a missing title", () => {
  const result = validateSuggestionInput("   ", "https://youtu.be/abc");
  assert(!result.ok);
  assertEquals(result.error, "missing_title");
});

Deno.test("validateSuggestionInput flags an invalid url", () => {
  const result = validateSuggestionInput("My Song", "nope");
  assert(!result.ok);
  assertEquals(result.error, "invalid_url");
});
