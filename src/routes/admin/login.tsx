import { define } from "../../utils.ts";

export const handler = define.handlers({
  GET(ctx) {
    return Response.redirect(
      new URL("/account/login", ctx.req.url).href,
      302,
    );
  },
});

export default define.page(() => (
  <p class="p-6 text-base-800 dark:text-base-100">Redirecting…</p>
));
