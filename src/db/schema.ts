import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const tracks = sqliteTable("tracks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  audioUrl: text("audio_url").notNull(),
  difficulty: text("difficulty", { enum: ["easy", "hard"] }).notNull(),
  /** Full-track dB gain toward ~-16 LUFS; null if not measured. Used for full-track playback (collection). */
  playbackGainDb: real("playback_gain_db"),
  /** Byte size of the audio file when gain was last computed or fingerprint seeded. */
  playbackGainSourceSize: integer("playback_gain_source_size"),
  /** `mtime` of the audio file in ms since epoch; null if unknown (no cache skip). */
  playbackGainSourceMtimeMs: integer("playback_gain_source_mtime_ms"),
  /** Seconds into the file where quiz playback starts; null = 0. */
  playStartSeconds: real("play_start_seconds"),
  /** Max clip length from start (includes fades); null = app default. */
  maxPlaySeconds: real("max_play_seconds"),
  /** dB gain toward ~-16 LUFS measured over the quiz clip window; null if not measured. Used by quiz + admin preview. */
  clipPlaybackGainDb: real("clip_playback_gain_db"),
  /** Resolved clip start (seconds) the clip gain was measured at; for invalidation when the window shifts. */
  clipPlaybackGainStartSeconds: real("clip_playback_gain_start_seconds"),
  /** Resolved clip max length (seconds) the clip gain was measured at; for invalidation when the window shifts. */
  clipPlaybackGainMaxSeconds: real("clip_playback_gain_max_seconds"),
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

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull(),
  admin: integer("admin", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  data: text("data"),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const quizInstances = sqliteTable(
  "quiz_instances",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    categorySlug: text("category_slug").notNull(),
    difficulty: text("difficulty", { enum: ["easy", "hard", "mixed"] })
      .notNull(),
    code: text("code").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("quiz_instances_category_difficulty_code_idx").on(
      table.categorySlug,
      table.difficulty,
      table.code,
    ),
  ],
);

export const quizInstanceTracks = sqliteTable(
  "quiz_instance_tracks",
  {
    quizInstanceId: text("quiz_instance_id").notNull().references(
      () => quizInstances.id,
      { onDelete: "cascade" },
    ),
    position: integer("position").notNull(),
    // Intentionally no FK to tracks: deleted tracks should remain representable
    // as unavailable rounds while preserving snapshot identity.
    trackId: text("track_id").notNull(),
    trackTitleSnapshot: text("track_title_snapshot").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.quizInstanceId, table.position] }),
  ],
);

export const collectedTracks = sqliteTable(
  "collected_tracks",
  {
    userId: text("user_id").notNull().references(() => users.id, {
      onDelete: "cascade",
    }),
    trackId: text("track_id").notNull().references(() => tracks.id, {
      onDelete: "cascade",
    }),
    collectedAt: integer("collected_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.trackId] }),
  ],
);

export const passkeys = sqliteTable("passkeys", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  transports: text("transports"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
