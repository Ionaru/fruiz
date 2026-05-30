import { define } from "../../../utils.ts";
import { deleteUserAccount } from "../../../lib/deleteAccount.ts";
import { appendClearSessionCookie } from "../../../lib/session.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const user = ctx.state.session.user;
    if (!user) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    // Removing the user row cascades to passkeys, sessions, and collected_tracks,
    // so the current session is destroyed as part of this delete.
    await deleteUserAccount(user.id);

    const headers = new Headers();
    appendClearSessionCookie(headers);

    if (ctx.req.headers.get("accept")?.includes("application/json")) {
      return Response.json({ ok: true }, { status: 200, headers });
    }
    headers.set("Location", new URL("/", ctx.req.url).href);
    return new Response(null, { status: 302, headers });
  },
});
