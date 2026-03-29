import { assertEquals } from "jsr:@std/assert@1";
import { SESSION_COOKIE_NAME } from "../../../lib/session.ts";

Deno.test("session cookie name is stable", () => {
  assertEquals(SESSION_COOKIE_NAME, "fruiz_session");
});
