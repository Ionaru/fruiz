import { eq } from "drizzle-orm";

import type { DB } from "../db/db.ts";
import { trackSuggestions } from "../db/schema.ts";
import { getCategoryBySlugOrId } from "./categories.ts";
import {
  type SuggestionInputError,
  type SuggestionStatus,
  validateSuggestionInput,
} from "./suggestionValidation.ts";

export type { SuggestionInputError, SuggestionStatus };

export interface SuggestionRow {
  id: string;
  title: string;
  youtubeUrl: string;
  status: SuggestionStatus;
  adminNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  category: { id: string; name: string; slug: string };
  user: { id: string; username: string };
}

export type CreateSuggestionInput = {
  userId: string;
  categoryKey: string;
  title: string;
  youtubeUrl: string;
};

export type CreateSuggestionResult =
  | { ok: true; id: string }
  | { ok: false; error: SuggestionInputError | "invalid_category" };

export async function createSuggestion(
  runner: DB,
  input: CreateSuggestionInput,
): Promise<CreateSuggestionResult> {
  const validated = validateSuggestionInput(input.title, input.youtubeUrl);
  if (!validated.ok) return { ok: false, error: validated.error };

  const category = await getCategoryBySlugOrId(runner, input.categoryKey);
  if (!category) return { ok: false, error: "invalid_category" };

  const id = crypto.randomUUID();
  await runner.insert(trackSuggestions).values({
    id,
    userId: input.userId,
    categoryId: category.id,
    title: validated.title,
    youtubeUrl: validated.youtubeUrl,
    status: "pending",
    createdAt: new Date(),
  });
  return { ok: true, id };
}

/**
 * Structural shape this module reads off a suggestion row. The relational query
 * returns wider rows (the joined `user` also carries `admin`/`createdAt`); width
 * subtyping lets those pass here without a cast.
 */
interface SuggestionRowInput {
  id: string;
  title: string;
  youtubeUrl: string;
  status: SuggestionStatus;
  adminNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  category: { id: string; name: string; slug: string } | null;
  user: { id: string; username: string } | null;
}

/** Maps a row to the public shape, or null when a required relation is missing. */
function toSuggestionRow(row: SuggestionRowInput): SuggestionRow | null {
  if (!row.category || !row.user) return null;
  return {
    id: row.id,
    title: row.title,
    youtubeUrl: row.youtubeUrl,
    status: row.status,
    adminNote: row.adminNote,
    reviewedAt: row.reviewedAt,
    createdAt: row.createdAt,
    category: {
      id: row.category.id,
      name: row.category.name,
      slug: row.category.slug,
    },
    user: { id: row.user.id, username: row.user.username },
  };
}

function toSuggestionRows(rows: SuggestionRowInput[]): SuggestionRow[] {
  const out: SuggestionRow[] = [];
  for (const row of rows) {
    const mapped = toSuggestionRow(row);
    if (mapped) out.push(mapped);
  }
  return out;
}

const STATUS_ORDER: Record<SuggestionStatus, number> = {
  pending: 0,
  approved: 1,
  denied: 1,
};

/** Admin moderation queue: pending first, then newest. */
export async function listSuggestionsForAdmin(
  runner: DB,
): Promise<SuggestionRow[]> {
  const rows = await runner.query.trackSuggestions.findMany({
    orderBy: { createdAt: "desc" },
    with: { category: true, user: true },
  });
  const mapped = toSuggestionRows(rows);
  return mapped.sort((left, right) =>
    STATUS_ORDER[left.status] - STATUS_ORDER[right.status]
  );
}

/** Player's own suggestions, newest first. */
export async function listSuggestionsForUser(
  runner: DB,
  userId: string,
): Promise<SuggestionRow[]> {
  const rows = await runner.query.trackSuggestions.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    with: { category: true, user: true },
  });
  return toSuggestionRows(rows);
}

export async function getSuggestionById(
  runner: DB,
  id: string,
): Promise<SuggestionRow | null> {
  const row = await runner.query.trackSuggestions.findFirst({
    where: { id },
    with: { category: true, user: true },
  });
  if (!row) return null;
  return toSuggestionRow(row);
}

export async function countPendingSuggestions(runner: DB): Promise<number> {
  const rows = await runner
    .select({ id: trackSuggestions.id })
    .from(trackSuggestions)
    .where(eq(trackSuggestions.status, "pending"));
  return rows.length;
}

export type ReviewDecision = "approved" | "denied";

export type ReviewResult = { ok: true } | { ok: false; error: "not_found" };

/**
 * Records an admin decision and note. Has no side effect on the track corpus —
 * adding a real track stays a manual admin action. Re-review is allowed so an
 * admin can correct a prior decision.
 */
export async function reviewSuggestion(
  runner: DB,
  args: {
    id: string;
    decision: ReviewDecision;
    adminNote: string | null;
    reviewedByUserId: string;
  },
): Promise<ReviewResult> {
  const existing = await runner
    .select({ id: trackSuggestions.id })
    .from(trackSuggestions)
    .where(eq(trackSuggestions.id, args.id));
  if (existing.length === 0) return { ok: false, error: "not_found" };

  const note = args.adminNote?.trim();
  await runner
    .update(trackSuggestions)
    .set({
      status: args.decision,
      adminNote: note && note !== "" ? note : null,
      reviewedByUserId: args.reviewedByUserId,
      reviewedAt: new Date(),
    })
    .where(eq(trackSuggestions.id, args.id));
  return { ok: true };
}
