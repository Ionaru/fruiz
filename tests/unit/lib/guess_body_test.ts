import { assertEquals } from "@std/assert";
import { parseGuessBody } from "../../../src/lib/guessTelemetry.ts";

Deno.test("parseGuessBody reads a boolean matched flag", () => {
  assertEquals(parseGuessBody({ matched: true }), { matched: true });
  assertEquals(parseGuessBody({ matched: false }), { matched: false });
});

Deno.test("parseGuessBody rejects non-object / missing / non-boolean", () => {
  assertEquals(parseGuessBody(null), null);
  assertEquals(parseGuessBody("nope"), null);
  assertEquals(parseGuessBody({}), null);
  assertEquals(parseGuessBody({ matched: "true" }), null);
});
