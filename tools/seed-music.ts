import { db } from "../db/db.ts";
import { seedTracksFromMusicDir } from "../lib/seedMusic.ts";

const { inserted, skipped } = await seedTracksFromMusicDir(db, {
  categorySlug: "video-games", // created if missing; links new tracks
  categoryName: "Video Games", // optional; default: title case from slug
  difficulty: "easy",
});
console.log({ inserted, skipped });
