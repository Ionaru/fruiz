import { define } from "../utils.ts";

export const helloMiddleware = define.middleware(async (ctx) => {
  ctx.state.shared = "hello";
  return await ctx.next();
});
