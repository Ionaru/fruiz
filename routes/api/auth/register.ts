import { define } from "../../../utils.ts";
import { beginRegistration, finishRegistration } from "../../../lib/auth.ts";

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export const handler = define.handlers({
  async GET(ctx) {
    const adminUserId = ctx.url.searchParams.get("adminUserId");
    if (!adminUserId) {
      return json({ error: "adminUserId query parameter is required" }, 400);
    }
    try {
      const { challengeId, options } = await beginRegistration(adminUserId);
      return json({ challengeId, options });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Not found";
      if (msg.includes("not found")) {
        return json({ error: "Admin user not found" }, 404);
      }
      return json({ error: msg }, 400);
    }
  },

  async POST(ctx) {
    let body: {
      challengeId?: string;
      adminUserId?: string;
      credential?: unknown;
    };
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
      const result = await finishRegistration(
        body.challengeId,
        body.credential,
        origin,
        { expectedAdminUserId: body.adminUserId },
      );
      return json(
        {
          ok: true,
          adminUserId: result.adminUserId,
          credentialId: result.credentialId,
        },
        201,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Verification failed";
      if (
        msg.includes("Invalid challenge") ||
        msg.includes("Admin mismatch")
      ) {
        return json({ error: msg }, 400);
      }
      if (msg.includes("verification failed")) {
        return json({ error: msg }, 401);
      }
      return json({ error: msg }, 401);
    }
  },
});
