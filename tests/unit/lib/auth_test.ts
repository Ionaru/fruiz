import { assertEquals } from "@std/assert";
import { validateUsername } from "../../../lib/auth.ts";

Deno.test("validateUsername rejects too short", () => {
  assertEquals(
    validateUsername("ab"),
    "Username must be between 3 and 24 characters.",
  );
  assertEquals(
    validateUsername("  x  "),
    "Username must be between 3 and 24 characters.",
  );
});

Deno.test("validateUsername rejects too long", () => {
  assertEquals(
    validateUsername("a".repeat(25)),
    "Username must be between 3 and 24 characters.",
  );
});

Deno.test("validateUsername accepts 3 and 24 chars (trimmed)", () => {
  assertEquals(validateUsername("abc"), null);
  assertEquals(validateUsername("  abc  "), null);
  assertEquals(validateUsername("a".repeat(24)), null);
});
