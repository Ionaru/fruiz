import { asc, eq } from "drizzle-orm";

import type { DB } from "../db/db.ts";
import { quizInstances, quizInstanceTracks, tracks } from "../db/schema.ts";
import type { DifficultyMode, QuizTrackPayload } from "./types.ts";
import { resolvedPlaybackFromDbFields } from "./quizPlayback.ts";
import { selectTracksDeterministic } from "./selectTracks.ts";
import { getTracksForCategory } from "./categories.ts";
import {
  quizCacheHitCounter,
  quizCreatedCounter,
  withSpan,
} from "./telemetry.ts";

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
  playbackGainDb: number | null;
  clipPlaybackGainDb: number | null;
  playStartSeconds: number | null;
  maxPlaySeconds: number | null;
  playbackGainSourceSize: number | null;
  playbackGainSourceMtimeMs: number | null;
}

export function toSnapshotQuizPayload(
  snapshotRows: SnapshotTrackRow[],
): QuizTrackPayload[] {
  return snapshotRows.map((snapshotRow) => {
    const title = snapshotRow.title;
    const difficulty = snapshotRow.difficulty;
    const audioUrl = snapshotRow.audioUrl;
    if (title && difficulty && audioUrl) {
      const playback = resolvedPlaybackFromDbFields({
        playStartSeconds: snapshotRow.playStartSeconds,
        maxPlaySeconds: snapshotRow.maxPlaySeconds,
      });
      return {
        id: snapshotRow.trackId,
        title,
        audioUrl,
        difficulty,
        unavailable: false,
        playbackGainDb: snapshotRow.playbackGainDb,
        clipPlaybackGainDb: snapshotRow.clipPlaybackGainDb,
        playStartSeconds: playback.playStartSeconds,
        maxPlaySeconds: playback.maxPlaySeconds,
        playbackGainSourceSize: snapshotRow.playbackGainSourceSize,
        playbackGainSourceMtimeMs: snapshotRow.playbackGainSourceMtimeMs,
      };
    }
    const playback = resolvedPlaybackFromDbFields({});
    return {
      id: snapshotRow.trackId,
      title: `${snapshotRow.trackTitleSnapshot} (Unavailable)`,
      audioUrl: null,
      difficulty: "easy",
      unavailable: true,
      playbackGainDb: null,
      clipPlaybackGainDb: null,
      playStartSeconds: playback.playStartSeconds,
      maxPlaySeconds: playback.maxPlaySeconds,
      playbackGainSourceSize: null,
      playbackGainSourceMtimeMs: null,
    };
  });
}

async function createQuizInstance(
  drizzle: DB,
  args: CreateArgs,
): Promise<QuizInstanceData | null> {
  const pool = await getTracksForCategory(drizzle, args.categoryId);
  const selected = await withSpan(
    "quiz.select_tracks",
    (span) => {
      const result = selectTracksDeterministic(
        pool,
        args.difficulty,
        args.code,
        20,
      );
      span.setAttribute("track_count", result.length);
      return result;
    },
    { category: args.categorySlug, difficulty: args.difficulty },
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
    tracks: selected.map((selectedTrack) => {
      const playback = resolvedPlaybackFromDbFields({
        playStartSeconds: selectedTrack.playStartSeconds,
        maxPlaySeconds: selectedTrack.maxPlaySeconds,
      });
      return {
        id: selectedTrack.id,
        title: selectedTrack.title,
        audioUrl: selectedTrack.audioUrl,
        difficulty: selectedTrack.difficulty,
        unavailable: false,
        playbackGainDb: selectedTrack.playbackGainDb,
        clipPlaybackGainDb: selectedTrack.clipPlaybackGainDb,
        playStartSeconds: playback.playStartSeconds,
        maxPlaySeconds: playback.maxPlaySeconds,
        playbackGainSourceSize: selectedTrack.playbackGainSourceSize,
        playbackGainSourceMtimeMs: selectedTrack.playbackGainSourceMtimeMs,
      };
    }),
  };
}

export async function getQuizInstance(
  drizzle: DB,
  categorySlug: string,
  difficulty: DifficultyMode,
  code: string,
): Promise<QuizInstanceData | null> {
  const instance = await drizzle.query.quizInstances.findFirst({
    where: { categorySlug, difficulty, code },
    columns: {
      id: true,
      categorySlug: true,
      difficulty: true,
      code: true,
    },
  });
  if (!instance) return null;

  const snapshotRows = await drizzle.select({
    trackId: quizInstanceTracks.trackId,
    trackTitleSnapshot: quizInstanceTracks.trackTitleSnapshot,
    position: quizInstanceTracks.position,
    title: tracks.title,
    audioUrl: tracks.audioUrl,
    difficulty: tracks.difficulty,
    playbackGainDb: tracks.playbackGainDb,
    clipPlaybackGainDb: tracks.clipPlaybackGainDb,
    playStartSeconds: tracks.playStartSeconds,
    maxPlaySeconds: tracks.maxPlaySeconds,
    playbackGainSourceSize: tracks.playbackGainSourceSize,
    playbackGainSourceMtimeMs: tracks.playbackGainSourceMtimeMs,
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
  drizzle: DB,
  args: CreateArgs,
): Promise<QuizInstanceData | null> {
  return await withSpan("quiz.materialize", async () => {
    const existing = await getQuizInstance(
      drizzle,
      args.categorySlug,
      args.difficulty,
      args.code,
    );
    if (existing) {
      quizCacheHitCounter.add(1, {
        category: args.categorySlug,
        difficulty: args.difficulty,
      });
      return existing;
    }

    try {
      const created = await createQuizInstance(drizzle, args);
      if (created) {
        quizCreatedCounter.add(1, {
          category: args.categorySlug,
          difficulty: args.difficulty,
        });
      }
      return created;
    } catch {
      // Unique conflicts can happen when two requests create the same code.
      const retried = await getQuizInstance(
        drizzle,
        args.categorySlug,
        args.difficulty,
        args.code,
      );
      if (retried) {
        quizCacheHitCounter.add(1, {
          category: args.categorySlug,
          difficulty: args.difficulty,
        });
      }
      return retried;
    }
  }, { category: args.categorySlug, difficulty: args.difficulty });
}
