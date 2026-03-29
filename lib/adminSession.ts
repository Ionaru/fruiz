import type { State } from "../utils.ts";

export type AdminRouteSession = {
  userId: string;
  username: string;
  admin: boolean;
  sessionId: string;
};

/**
 * `/admin/*`: valid DB session **and** `users.admin === true`.
 * Guests → `/account/login`. Logged-in non-admin → `/account`.
 */
export function requireAdminSessionOrRedirect(
  ctx: { req: Request; state: State },
): { session: AdminRouteSession } | Response {
  const { user, id: sessionId } = ctx.state.session;
  if (!user || !sessionId) {
    return Response.redirect(new URL("/account/login", ctx.req.url).href, 302);
  }
  if (!user.admin) {
    return Response.redirect(new URL("/account", ctx.req.url).href, 302);
  }
  return {
    session: {
      userId: user.id,
      username: user.username,
      admin: user.admin,
      sessionId,
    },
  };
}
