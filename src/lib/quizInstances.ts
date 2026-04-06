import { and, asc, eq } from "drizzle-orm";

import { db } from "../db/db.ts";
import { quizInstances, quizInstanceTracks, tracks } from "../db/schema.ts";
import type { DifficultyMode, QuizTrackPayload } from "./types.ts";
import { selectTracksDeterministic } from "./selectTracks.ts";
import { getTracksForCategory } from "./categories.ts";

type DrizzleDb = typeof db;

interface CreateArgs {
  categorySlug: string;
  categoryId: string;
  difficulty: DifficultyMode;
  code: string;
}

export interface QuizInstanceData {
  id: string;
  categorySlug: string;
  difficulty: DifficultyMode;
  code: string;
  tracks: QuizTrackPayload[];
}

export interface SnapshotTrackRow {
  trackId: string;
  trackTitleSnapshot: string;
  title: string | null;
  audioUrl: string | null;
  difficulty: "easy" | "hard" | null;
}

export function toSnapshotQuizPayload(
  snapshotRows: SnapshotTrackRow[],
): QuizTrackPayload[] {
  return snapshotRows.map((snapshotRow) => {
    const missingTrack = !snapshotRow.title || !snapshotRow.difficulty ||
      !snapshotRow.audioUrl;
    const resolvedTitle = missingTrack
      ? `${snapshotRow.trackTitleSnapshot} (Unavailable)`
      : snapshotRow.title!;
    const resolvedDifficulty = missingTrack ? "easy" : snapshotRow.difficulty!;
    const resolvedAudioUrl = missingTrack ? null : snapshotRow.audioUrl!;
    return {
      id: snapshotRow.trackId,
      title: resolvedTitle,
      audioUrl: resolvedAudioUrl,
      difficulty: resolvedDifficulty,
      unavailable: missingTrack,
    };
  });
}

async function createQuizInstance(
  drizzle: DrizzleDb,
  args: CreateArgs,
): Promise<QuizInstanceData | null> {
  const pool = await getTracksForCategory(drizzle, args.categoryId);
  const selected = selectTracksDeterministic(
    pool,
    args.difficulty,
    args.code,
    20,
  );
  if (selected.length < 20) return null;

  const createdAt = new Date();
  const [quizInstance] = await drizzle.insert(quizInstances).values({
    categorySlug: args.categorySlug,
    difficulty: args.difficulty,
    code: args.code,
    createdAt,
  }).returning({
    id: quizInstances.id,
    categorySlug: quizInstances.categorySlug,
    difficulty: quizInstances.difficulty,
    code: quizInstances.code,
  });
  if (!quizInstance) return null;

  await drizzle.insert(quizInstanceTracks).values(
    selected.map((selectedTrack, selectedIndex) => ({
      quizInstanceId: quizInstance.id,
      position: selectedIndex,
      trackId: selectedTrack.id,
      trackTitleSnapshot: selectedTrack.title,
    })),
  );

  return {
    ...quizInstance,
    difficulty: quizInstance.difficulty as DifficultyMode,
    tracks: selected.map((selectedTrack) => ({
      id: selectedTrack.id,
      title: selectedTrack.title,
      audioUrl: selectedTrack.audioUrl,
      difficulty: selectedTrack.difficulty,
      unavailable: false,
    })),
  };
}

export async function getQuizInstance(
  drizzle: DrizzleDb,
  categorySlug: string,
  difficulty: DifficultyMode,
  code: string,
): Promise<QuizInstanceData | null> {
  const [instance] = await drizzle.select({
    id: quizInstances.id,
    categorySlug: quizInstances.categorySlug,
    difficulty: quizInstances.difficulty,
    code: quizInstances.code,
  }).from(quizInstances).where(
    and(
      eq(quizInstances.categorySlug, categorySlug),
      eq(quizInstances.difficulty, difficulty),
      eq(quizInstances.code, code),
    ),
  ).limit(1);
  if (!instance) return null;

  const snapshotRows = await drizzle.select({
    trackId: quizInstanceTracks.trackId,
    trackTitleSnapshot: quizInstanceTracks.trackTitleSnapshot,
    position: quizInstanceTracks.position,
    title: tracks.title,
    audioUrl: tracks.audioUrl,
    difficulty: tracks.difficulty,
  }).from(quizInstanceTracks)
    .leftJoin(tracks, eq(tracks.id, quizInstanceTracks.trackId))
    .where(eq(quizInstanceTracks.quizInstanceId, instance.id))
    .orderBy(asc(quizInstanceTracks.position));

  return {
    ...instance,
    difficulty: instance.difficulty as DifficultyMode,
    tracks: toSnapshotQuizPayload(snapshotRows),
  };
}

export async function getOrCreateQuizInstance(
  drizzle: DrizzleDb,
  args: CreateArgs,
): Promise<QuizInstanceData | null> {
  const existing = await getQuizInstance(
    drizzle,
    args.categorySlug,
    args.difficulty,
    args.code,
  );
  if (existing) return existing;

  try {
    return await createQuizInstance(drizzle, args);
  } catch (_error) {
    // Unique conflicts can happen when two requests create the same code.
    return await getQuizInstance(
      drizzle,
      args.categorySlug,
      args.difficulty,
      args.code,
    );
  }
}
