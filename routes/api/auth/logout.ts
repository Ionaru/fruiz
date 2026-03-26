import { define } from "../../../utils.ts";
import { clearSessionCookieHeader } from "../../../lib/auth.ts";

export const handler = define.handlers({
  POST(ctx) {
    const cookie = clearSessionCookieHeader();
    if (ctx.req.headers.get("accept")?.includes("application/json")) {
      return Response.json({ ok: true }, {
        status: 200,
        headers: { "Set-Cookie": cookie },
      });
    }
    return new Response(null, {
      status: 302,
      headers: {
        Location: new URL("/admin/login", ctx.req.url).href,
        "Set-Cookie": cookie,
      },
    });
  },
});
