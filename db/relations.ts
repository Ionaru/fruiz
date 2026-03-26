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
  adminUsers: {
    passkeys: relations.many.passkeys({
      from: relations.adminUsers.id,
      to: relations.passkeys.adminUserId,
    }),
  },
  passkeys: {
    adminUser: relations.one.adminUsers({
      from: relations.passkeys.adminUserId,
      to: relations.adminUsers.id,
    }),
  },
}));
