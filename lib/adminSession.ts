import type { AdminSession } from "./auth.ts";
import { getSessionFromRequest } from "./auth.ts";

/** Returns a session or a redirect `Response` to the admin login page. */
export async function requireAdminSessionOrRedirect(
  req: Request,
): Promise<{ session: AdminSession } | Response> {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return Response.redirect(new URL("/admin/login", req.url).href, 302);
  }
  return { session };
}
