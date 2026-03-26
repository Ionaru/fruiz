import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tracks = sqliteTable('tracks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  fileName: text('file_name').notNull(),
  difficulty: text('difficulty', { enum: ['easy', 'hard'] }).notNull(),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
});

export const trackCategories = sqliteTable('track_categories', {
  trackId: text('track_id').notNull().references(() => tracks.id),
  categoryId: text('category_id').notNull().references(() => categories.id),
}, (table) => [
  primaryKey({ columns: [table.trackId, table.categoryId] }),
]);
