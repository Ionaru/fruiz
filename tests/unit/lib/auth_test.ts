import { assertEquals } from "jsr:@std/assert@1";
import { parseAdminSession } from "../../../lib/auth.ts";

Deno.test("parseAdminSession returns null for malformed cookie", async () => {
  assertEquals(await parseAdminSession(undefined), null);
  assertEquals(await parseAdminSession(""), null);
  assertEquals(await parseAdminSession("not-a-session"), null);
});
