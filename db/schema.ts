import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const tracks = sqliteTable("tracks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  audioUrl: text("audio_url").notNull(),
  difficulty: text("difficulty", { enum: ["easy", "hard"] }).notNull(),
});

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const trackCategories = sqliteTable(
  "track_categories",
  {
    trackId: text("track_id").notNull().references(() => tracks.id),
    categoryId: text("category_id").notNull().references(() => categories.id),
  },
  (table) => [
    primaryKey({ columns: [table.trackId, table.categoryId] }),
  ],
);

export const adminUsers = sqliteTable("admin_users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const passkeys = sqliteTable("passkeys", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  adminUserId: text("admin_user_id").notNull().references(() => adminUsers.id),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  transports: text("transports"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
