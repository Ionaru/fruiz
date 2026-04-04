import { define } from "../../../utils.ts";
import {
  appendClearSessionCookie,
  deleteDbSession,
} from "../../../lib/session.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const sid = ctx.state.session.id;
    if (sid) {
      await deleteDbSession(sid).catch(() => {});
    }

    const headers = new Headers();
    appendClearSessionCookie(headers);

    if (ctx.req.headers.get("accept")?.includes("application/json")) {
      return Response.json({ ok: true }, {
        status: 200,
        headers,
      });
    }
    headers.set("Location", new URL("/account/login", ctx.req.url).href);
    return new Response(null, { status: 302, headers });
  },
});
