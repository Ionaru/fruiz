import { define } from "../../../utils.ts";
import {
  beginPublicRegistration,
  validateUsername,
  verifyPublicRegistration,
} from "../../../lib/auth.ts";
import { insertUserPasskeyAndSession } from "../../../lib/completeRegistration.ts";
import { appendSessionCookie } from "../../../lib/session.ts";

function json(data: unknown, init: number | ResponseInit = 200): Response {
  return typeof init === "number"
    ? Response.json(data, { status: init })
    : Response.json(data, init);
}

export const handler = define.handlers({
  async GET(ctx) {
    const username = ctx.url.searchParams.get("username") ?? "";
    const err = validateUsername(username);
    if (err) {
      return json({ error: err }, 400);
    }
    try {
      const { challengeId, options } = await beginPublicRegistration(username);
      return json({ challengeId, options });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Server error";
      return json({ error: msg }, 500);
    }
  },

  async POST(ctx) {
    let body: {
      challengeId?: string;
      username?: string;
      credential?: unknown;
    };
    try {
      body = await ctx.req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    if (
      !body.challengeId || body.credential === undefined ||
      body.username === undefined
    ) {
      return json(
        { error: "challengeId, username, and credential are required" },
        400,
      );
    }
    const uerr = validateUsername(body.username);
    if (uerr) return json({ error: uerr }, 400);

    const origin = ctx.req.headers.get("origin") ??
      new URL(ctx.req.url).origin;
    try {
      const verified = await verifyPublicRegistration(
        body.challengeId,
        body.credential,
        origin,
      );
      if (verified.username !== body.username.trim()) {
        return json({ error: "Username does not match registration" }, 400);
      }
      const sessionId = insertUserPasskeyAndSession(verified);
      const headers = new Headers();
      appendSessionCookie(headers, sessionId);
      return json({ ok: true, userId: verified.pendingUserId }, {
        status: 201,
        headers,
      });
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
