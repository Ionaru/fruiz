import { define } from "../../../utils.ts";

/** Legacy admin-only registration — removed in favor of `/api/auth/register-public`. */
export const handler = define.handlers({
  GET() {
    return Response.json(
      {
        error:
          "Deprecated: use GET /api/auth/register-public?username= for public registration.",
      },
      { status: 410 },
    );
  },
  POST() {
    return Response.json(
      {
        error:
          "Deprecated: use POST /api/auth/register-public for public registration.",
      },
      { status: 410 },
    );
  },
});
