import { createDefine } from "fresh";

import type { SessionUser } from "./lib/session.ts";

/**
 * Snapshot of the signed-in user for this request (from DB via session middleware).
 * `admin` is authoritative from `users` row each load — not cached across requests beyond session hydration.
 */
export type AuthUserSnapshot = SessionUser;

/**
 * Session-scoped server state persisted in `sessions.data` (JSON) when handlers mutate `data` and middleware detects a change.
 */
export interface SessionStateSlice {
  /** DB `sessions.id` when logged in; `null` for guests or unknown cookies. */
  id: string | null;
  user: AuthUserSnapshot | null;
  /** Mutable JSON-shaped bag; middleware stringifies to `sessions.data` if changed after the handler runs. */
  data: Record<string, unknown>;
}

// This specifies the type of "ctx.state" which is used to share
// data among middlewares, layouts and routes.
export interface State {
  shared: string;
  session: SessionStateSlice;
}

export const define = createDefine<State>();
