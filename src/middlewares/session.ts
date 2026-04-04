import { define } from "../utils.ts";
import {
  appendClearSessionCookie,
  loadActiveSession,
  persistSessionData,
  readSessionCookie,
  touchSessionExpiry,
} from "../lib/session.ts";

function shouldSkipSessionDbLoad(url: URL): boolean {
  const p = url.pathname;
  if (p.startsWith("/@") || p.startsWith("/node_modules/")) return true;
  if (p.startsWith("/_fresh/")) return true;
  if (p.startsWith("/static/")) return true;
  return /\.(css|js|mjs|map|ico|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot)$/i
    .test(p);
}

function guestSession(): import("../utils.ts").SessionStateSlice {
  return { id: null, user: null, data: {} };
}

export const sessionMiddleware = define.middleware(async (ctx) => {
  if (shouldSkipSessionDbLoad(ctx.url)) {
    ctx.state.session = guestSession();
    return await ctx.next();
  }

  const cookieVal = readSessionCookie(ctx.req);
  if (!cookieVal) {
    ctx.state.session = guestSession();
    return await ctx.next();
  }

  const loaded = await loadActiveSession(cookieVal);
  if (!loaded) {
    ctx.state.session = guestSession();
    const res = await ctx.next();
    const headers = new Headers(res.headers);
    appendClearSessionCookie(headers);
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  }

  const initialData = structuredClone(loaded.data);
  ctx.state.session = {
    id: loaded.sessionId,
    user: loaded.user,
    data: loaded.data,
  };

  await touchSessionExpiry(loaded.sessionId);

  const res = await ctx.next();

  const after = ctx.state.session;
  if (!after.id || !after.user) {
    return res;
  }

  try {
    if (JSON.stringify(after.data) !== JSON.stringify(initialData)) {
      await persistSessionData(after.id, after.data);
    }
  } catch {
    // Avoid taking down the request if JSON persistence fails
  }

  return res;
});
