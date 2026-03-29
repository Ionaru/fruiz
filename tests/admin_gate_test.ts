import { assert, assertEquals } from "jsr:@std/assert@1";
import { requireAdminSessionOrRedirect } from "../lib/adminSession.ts";
import type { State } from "../utils.ts";

function req(url: string) {
  return new Request(url);
}

function state(over: Partial<State["session"]> & Pick<State, "shared">): State {
  return {
    shared: over.shared,
    session: {
      id: over.id ?? null,
      user: over.user ?? null,
      data: over.data ?? {},
    },
  };
}

Deno.test("requireAdminSessionOrRedirect: guest → login", () => {
  const out = requireAdminSessionOrRedirect({
    req: req("http://127.0.0.1/admin"),
    state: state({
      shared: "x",
      id: null,
      user: null,
    }),
  });
  assert(out instanceof Response);
  assertEquals(out.status, 302);
  assertEquals(
    out.headers.get("Location"),
    "http://127.0.0.1/account/login",
  );
});

Deno.test("requireAdminSessionOrRedirect: non-admin → account", () => {
  const out = requireAdminSessionOrRedirect({
    req: req("http://127.0.0.1/admin"),
    state: state({
      shared: "x",
      id: "sid",
      user: { id: "u1", username: "pat", admin: false },
    }),
  });
  assert(out instanceof Response);
  assertEquals(out.status, 302);
  assertEquals(out.headers.get("Location"), "http://127.0.0.1/account");
});

Deno.test("requireAdminSessionOrRedirect: admin → session object", () => {
  const out = requireAdminSessionOrRedirect({
    req: req("http://127.0.0.1/admin"),
    state: state({
      shared: "x",
      id: "sid",
      user: { id: "u1", username: "admin", admin: true },
    }),
  });
  assert(!(out instanceof Response));
  assertEquals(out.session.userId, "u1");
  assertEquals(out.session.username, "admin");
  assertEquals(out.session.admin, true);
  assertEquals(out.session.sessionId, "sid");
});
