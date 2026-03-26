import { assertEquals } from "jsr:@std/assert@1";
import { ADMIN_SESSION_COOKIE } from "../../../lib/auth.ts";

Deno.test("admin session cookie name is stable", () => {
  assertEquals(ADMIN_SESSION_COOKIE, "fruiz_admin");
});
