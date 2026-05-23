import { db } from "../db/db.ts";
import type { PasskeyConfig } from "../vendor/fresh-passkeys/mod.ts";
import type { State } from "../utils.ts";
import { validateUsername } from "./auth.ts";
import { insertUserPasskeyAndSession } from "./completeRegistration.ts";
import {
  appendSessionCookie,
  createDbSession,
  deleteDbSession,
} from "./session.ts";
import { DrizzlePasskeyStore } from "./passkeyStore.ts";

function getRpId(): string {
  return Deno.env.get("FRUIZ_RP_ID") ?? "localhost";
}

function getRpName(): string {
  return Deno.env.get("FRUIZ_RP_NAME") ?? "Musical Quiz";
}

/**
 * Fruiz-specific wiring for the passkey plugin: the Drizzle store plus the
 * identity/session hooks. The plugin owns the WebAuthn ceremonies; this keeps
 * the user model, the atomic registration transaction and the session cookie
 * on the host side.
 */
export function buildPasskeyConfig(): PasskeyConfig<State> {
  return {
    rpId: getRpId(),
    rpName: getRpName(),
    store: new DrizzlePasskeyStore(),
    validateUsername,
    getSessionUserId: (ctx) => ctx.state.session.user?.id ?? null,

    onRegistered: (verified) => {
      const sessionId = insertUserPasskeyAndSession(verified);
      const headers = new Headers();
      appendSessionCookie(headers, sessionId);
      return Promise.resolve(
        Response.json(
          { ok: true, userId: verified.pendingUserId },
          { status: 201, headers },
        ),
      );
    },

    onAuthenticated: async (userId, ctx) => {
      const priorSessionId = ctx.state.session.id;
      if (priorSessionId) {
        await deleteDbSession(priorSessionId).catch(() => {});
      }
      const sessionId = await createDbSession(userId);
      const headers = new Headers();
      appendSessionCookie(headers, sessionId);

      const user = await db.query.users.findFirst({ where: { id: userId } });
      return Response.json(
        {
          ok: true,
          user: {
            id: userId,
            username: user?.username ?? "",
            admin: user?.admin ?? false,
          },
        },
        { status: 200, headers },
      );
    },
  };
}
</content>
