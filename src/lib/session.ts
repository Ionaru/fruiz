import { getCookies, setCookie } from "@std/http/cookie";
import { eq } from "drizzle-orm";

import { db } from "../db/db.ts";
import { sessions, users } from "../db/schema.ts";

/** Opaque DB-backed session id stored in the browser cookie (replaces legacy HMAC cookie). */
export const SESSION_COOKIE_NAME = "fruiz_session";

export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const SESSION_TTL_SEC = Math.floor(SESSION_TTL_MS / 1000);

export function cookieSecure(): boolean {
  return Deno.env.get("FRUIZ_SECURE_COOKIES") === "1";
}

export type SessionUser = {
  id: string;
  username: string;
  admin: boolean;
};

export type LoadedSession = {
  sessionId: string;
  user: SessionUser;
  data: Record<string, unknown>;
  expiresAt: Date;
};

type DbLike = typeof db;

function parseSessionData(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as unknown;
    return typeof v === "object" && v !== null && !Array.isArray(v)
      ? v as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export async function loadActiveSession(
  sessionId: string,
  runner: DbLike = db,
): Promise<LoadedSession | null> {
  const now = new Date();
  const rows = await runner
    .select({
      sessionId: sessions.id,
      data: sessions.data,
      expiresAt: sessions.expiresAt,
      userId: users.id,
      username: users.username,
      admin: users.admin,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt < now) {
    await runner.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  return {
    sessionId: row.sessionId,
    user: {
      id: row.userId,
      username: row.username,
      admin: row.admin,
    },
    data: parseSessionData(row.data),
    expiresAt: row.expiresAt,
  };
}

export async function createDbSession(
  userId: string,
  runner: DbLike = db,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await runner.insert(sessions).values({
    id,
    userId,
    data: null,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function deleteDbSession(
  sessionId: string,
  runner: DbLike = db,
): Promise<void> {
  await runner.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function touchSessionExpiry(
  sessionId: string,
  runner: DbLike = db,
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await runner
    .update(sessions)
    .set({ expiresAt, updatedAt: now })
    .where(eq(sessions.id, sessionId));
}

export async function persistSessionData(
  sessionId: string,
  data: Record<string, unknown>,
  runner: DbLike = db,
): Promise<void> {
  const now = new Date();
  await runner
    .update(sessions)
    .set({
      data: JSON.stringify(data),
      updatedAt: now,
    })
    .where(eq(sessions.id, sessionId));
}

export function readSessionCookie(req: Request): string | undefined {
  const cookies = getCookies(req.headers);
  const raw = cookies[SESSION_COOKIE_NAME];
  return raw && raw.length > 0 ? raw : undefined;
}

export function appendSessionCookie(headers: Headers, sessionId: string): void {
  setCookie(headers, {
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    path: "/",
    httpOnly: true,
    sameSite: "Strict",
    secure: cookieSecure(),
    maxAge: SESSION_TTL_SEC,
  });
}

export function appendClearSessionCookie(headers: Headers): void {
  setCookie(headers, {
    name: SESSION_COOKIE_NAME,
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "Strict",
    secure: cookieSecure(),
    maxAge: 0,
  });
}
