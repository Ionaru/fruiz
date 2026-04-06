import { defineRelations } from "drizzle-orm";

import * as schema from "./schema.ts";

export const relations = defineRelations(schema, (relations) => ({
  tracks: {
    categories: relations.many.categories({
      from: relations.tracks.id.through(relations.trackCategories.trackId),
      to: relations.categories.id.through(relations.trackCategories.categoryId),
    }),
  },
  categories: {
    tracks: relations.many.tracks({
      from: relations.categories.id.through(
        relations.trackCategories.categoryId,
      ),
      to: relations.tracks.id.through(relations.trackCategories.trackId),
    }),
  },
  users: {
    passkeys: relations.many.passkeys({
      from: relations.users.id,
      to: relations.passkeys.userId,
    }),
    sessions: relations.many.sessions({
      from: relations.users.id,
      to: relations.sessions.userId,
    }),
  },
  passkeys: {
    user: relations.one.users({
      from: relations.passkeys.userId,
      to: relations.users.id,
    }),
  },
  sessions: {
    user: relations.one.users({
      from: relations.sessions.userId,
      to: relations.users.id,
    }),
  },
  quizInstances: {
    tracks: relations.many.quizInstanceTracks({
      from: relations.quizInstances.id,
      to: relations.quizInstanceTracks.quizInstanceId,
    }),
  },
  quizInstanceTracks: {
    quizInstance: relations.one.quizInstances({
      from: relations.quizInstanceTracks.quizInstanceId,
      to: relations.quizInstances.id,
    }),
  },
}));
