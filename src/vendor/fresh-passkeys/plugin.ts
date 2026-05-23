import type { App } from "fresh";

import {
  beginAddPasskey,
  beginAuthentication,
  beginPublicRegistration,
  type CeremonyOptions,
  finishAuthentication,
  verifyAddPasskey,
  verifyPublicRegistration,
} from "./ceremonies.ts";
import type { PasskeyConfig, PasskeyRequestContext } from "./types.ts";

function json(data: unknown, status = 200, headers?: Headers): Response {
  return Response.json(data, headers ? { status, headers } : { status });
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Server error";
}

/** Maps ceremony-finish errors to the HTTP status the host previously returned. */
function finishStatus(msg: string): number {
  if (msg.includes("Invalid challenge")) return 400;
  if (msg.includes("Unknown credential")) return 404;
  return 401;
}

async function readJson(
  req: Request,
): Promise<Record<string, unknown> | null> {
  try {
    return await req.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Registers the passkey ceremony endpoints on a Fresh 2.x app as a single
 * dispatch middleware (via `app.use`). Call before `app.fsRoutes()`, and after
 * whatever middleware populates the session the hooks read. Identity and
 * sessions are delegated to the config hooks.
 */
export function passkeyAuth<S>(
  app: App<S>,
  config: PasskeyConfig<S>,
): App<S> {
  const base = config.basePath ?? "/api/auth";
  const opts: CeremonyOptions = {
    rpId: config.rpId,
    rpName: config.rpName,
    store: config.store,
  };
  const originOf = (ctx: PasskeyRequestContext<S>): string => {
    if (config.expectedOrigin) return config.expectedOrigin(ctx.req);
    return ctx.req.headers.get("origin") ?? ctx.url.origin;
  };

  app.use(async (ctx) => {
    const route = `${ctx.req.method} ${ctx.url.pathname}`;

    if (route === `GET ${base}/register-public`) {
      const username = ctx.url.searchParams.get("username") ?? "";
      const err = config.validateUsername?.(username);
      if (err) return json({ error: err }, 400);
      try {
        return json(await beginPublicRegistration(opts, username));
      } catch (e) {
        return json({ error: message(e) }, 500);
      }
    }

    if (route === `POST ${base}/register-public`) {
      const body = await readJson(ctx.req);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      if (
        !body.challengeId || body.credential === undefined ||
        body.username === undefined
      ) {
        return json(
          { error: "challengeId, username, and credential are required" },
          400,
        );
      }
      const username = String(body.username);
      const uerr = config.validateUsername?.(username);
      if (uerr) return json({ error: uerr }, 400);
      try {
        const verified = await verifyPublicRegistration(
          opts,
          String(body.challengeId),
          body.credential,
          originOf(ctx),
        );
        if (verified.username !== username.trim()) {
          return json({ error: "Username does not match registration" }, 400);
        }
        return await config.onRegistered(verified, ctx);
      } catch (e) {
        const msg = message(e);
        return json({ error: msg }, finishStatus(msg));
      }
    }

    if (route === `GET ${base}/register-add-passkey`) {
      const userId = config.getSessionUserId(ctx);
      if (!userId) return json({ error: "Unauthorized" }, 401);
      try {
        return json(await beginAddPasskey(opts, userId));
      } catch (e) {
        return json({ error: message(e) }, 500);
      }
    }

    if (route === `POST ${base}/register-add-passkey`) {
      const userId = config.getSessionUserId(ctx);
      if (!userId) return json({ error: "Unauthorized" }, 401);
      const body = await readJson(ctx.req);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      if (!body.challengeId || body.credential === undefined) {
        return json({ error: "challengeId and credential are required" }, 400);
      }
      try {
        const { credentialId } = await verifyAddPasskey(
          opts,
          String(body.challengeId),
          body.credential,
          originOf(ctx),
          userId,
        );
        return json({ ok: true, credentialId }, 201);
      } catch (e) {
        const msg = message(e);
        return json({ error: msg }, finishStatus(msg));
      }
    }

    if (route === `GET ${base}/authenticate`) {
      try {
        return json(await beginAuthentication(opts));
      } catch (e) {
        const msg = message(e);
        if (msg.includes("No passkeys")) {
          return json({ error: "No passkeys registered" }, 404);
        }
        return json({ error: msg }, 500);
      }
    }

    if (route === `POST ${base}/authenticate`) {
      const body = await readJson(ctx.req);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      if (!body.challengeId || body.credential === undefined) {
        return json({ error: "challengeId and credential are required" }, 400);
      }
      try {
        const { userId } = await finishAuthentication(
          opts,
          String(body.challengeId),
          body.credential,
          originOf(ctx),
        );
        return await config.onAuthenticated(userId, ctx);
      } catch (e) {
        const msg = message(e);
        return json({ error: msg }, finishStatus(msg));
      }
    }

    return ctx.next();
  });

  return app;
}
</content>
