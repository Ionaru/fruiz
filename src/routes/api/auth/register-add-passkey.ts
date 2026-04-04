import { define } from "../../../utils.ts";
import { beginAddPasskey, verifyAddPasskey } from "../../../lib/auth.ts";

function json(data: unknown, init: number | ResponseInit = 200): Response {
  return typeof init === "number"
    ? Response.json(data, { status: init })
    : Response.json(data, init);
}

export const handler = define.handlers({
  async GET(ctx) {
    const user = ctx.state.session.user;
    const sessionId = ctx.state.session.id;
    if (!user || !sessionId) {
      return json({ error: "Unauthorized" }, 401);
    }
    try {
      const { challengeId, options } = await beginAddPasskey(user.id);
      return json({ challengeId, options });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Server error";
      return json({ error: msg }, 500);
    }
  },

  async POST(ctx) {
    const user = ctx.state.session.user;
    if (!user) {
      return json({ error: "Unauthorized" }, 401);
    }
    let body: { challengeId?: string; credential?: unknown };
    try {
      body = await ctx.req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    if (!body.challengeId || body.credential === undefined) {
      return json(
        { error: "challengeId and credential are required" },
        400,
      );
    }
    const origin = ctx.req.headers.get("origin") ??
      new URL(ctx.req.url).origin;
    try {
      const { credentialId } = await verifyAddPasskey(
        body.challengeId,
        body.credential,
        origin,
        user.id,
      );
      return json({ ok: true, credentialId }, { status: 201 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Verification failed";
      if (msg.includes("Invalid challenge")) {
        return json({ error: msg }, 400);
      }
      if (msg.includes("verification failed")) {
        return json({ error: msg }, 401);
      }
      return json({ error: msg }, 401);
    }
  },
});
