import { assert } from "@std/assert";
import {
  appendClearSessionCookie,
  SESSION_COOKIE_NAME,
} from "../lib/session.ts";

Deno.test("appendClearSessionCookie sets clearing attributes for session name", () => {
  const headers = new Headers();
  appendClearSessionCookie(headers);
  const raw = headers.get("Set-Cookie") ?? "";
  assert(raw.includes(`${SESSION_COOKIE_NAME}=`));
  assert(raw.includes("Max-Age=0") || raw.includes("max-age=0"));
  assert(raw.includes("HttpOnly"));
  assert(raw.includes("SameSite=Strict"));
});
