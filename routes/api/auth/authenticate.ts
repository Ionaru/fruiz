import { define } from "../../../utils.ts";
import {
  beginAuthentication,
  finishAuthentication,
} from "../../../lib/auth.ts";
import {
  appendSessionCookie,
  createDbSession,
  deleteDbSession,
} from "../../../lib/session.ts";

export const handler = define.handlers({
  async GET(_ctx) {
    try {
      const { challengeId, options } = await beginAuthentication();
      return Response.json({ challengeId, options });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unavailable";
      if (msg.includes("No passkeys")) {
        return Response.json({ error: "No passkeys registered" }, {
          status: 404,
        });
      }
      return Response.json({ error: msg }, { status: 500 });
    }
  },

  async POST(ctx) {
    let body: { challengeId?: string; credential?: unknown };
    try {
      body = await ctx.req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (!body.challengeId || body.credential === undefined) {
      return Response.json(
        { error: "challengeId and credential are required" },
        { status: 400 },
      );
    }
    const origin = ctx.req.headers.get("origin") ??
      new URL(ctx.req.url).origin;
    try {
      const user = await finishAuthentication(
        body.challengeId,
        body.credential,
        origin,
      );

      const priorSessionId = ctx.state.session.id;
      if (priorSessionId) {
        await deleteDbSession(priorSessionId).catch(() => {});
      }

      const sessionId = await createDbSession(user.userId);
      const headers = new Headers();
      appendSessionCookie(headers, sessionId);

      return Response.json(
        {
          ok: true,
          user: {
            id: user.userId,
            username: user.username,
            admin: user.admin,
          },
        },
        {
          status: 200,
          headers,
        },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Verification failed";
      if (msg.includes("Invalid challenge")) {
        return Response.json({ error: msg }, { status: 400 });
      }
      if (msg.includes("Unknown credential")) {
        return Response.json({ error: msg }, { status: 404 });
      }
      return Response.json({ error: msg }, { status: 401 });
    }
  },
});
