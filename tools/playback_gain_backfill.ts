/**
 * Recomputes `playback_gain_db` for tracks that need it (new/changed files or missing gain).
 * Uses stored file size + mtime to skip unchanged files. Requires `ffmpeg` on PATH when measuring.
 *
 * Run from repo root: `deno task playback-gain:backfill`
 * Force full re-measure: `deno task playback-gain:backfill -- --force`
 */
import { db } from "../src/db/db.ts";
import { analyzeAndStorePlaybackGainForTrack } from "../src/lib/playbackGainAnalysis.ts";

const force = Deno.args.includes("--force");

const rows = await db.query.tracks.findMany({
  columns: { id: true, audioUrl: true, title: true },
});

let cacheHit = 0;
let seeded = 0;
let measured = 0;
let ffmpegFailed = 0;
let invalidPath = 0;
let fileNotFound = 0;

for (const row of rows) {
  const outcome = await analyzeAndStorePlaybackGainForTrack(
    db,
    row.id,
    row.audioUrl,
    { force },
  );
  switch (outcome) {
    case "cache_hit":
      cacheHit++;
      break;
    case "seeded_fingerprint":
      seeded++;
      console.log(
        `Seeded fingerprint (existing gain): "${row.title}" (${row.id})`,
      );
      break;
    case "measured": {
      const after = await db.query.tracks.findFirst({
        where: { id: row.id },
        columns: { playbackGainDb: true },
      });
      if (after !== undefined && after.playbackGainDb !== null) {
        measured++;
        console.log(
          `Measured "${row.title}" (${row.id}): ${after.playbackGainDb} dB`,
        );
      }
      break;
    }
    case "ffmpeg_failed":
      ffmpegFailed++;
      console.warn(
        `Skipped "${row.title}" (${row.id}) — ffmpeg failed or not installed`,
      );
      break;
    case "invalid_audio_url":
      invalidPath++;
      console.warn(
        `Skipped "${row.title}" (${row.id}) — invalid audio URL`,
      );
      break;
    case "file_not_found":
      fileNotFound++;
      console.warn(
        `Skipped "${row.title}" (${row.id}) — audio file not found`,
      );
      break;
    default: {
      const exhaustive: never = outcome;
      throw new Error(`Unhandled outcome: ${exhaustive}`);
    }
  }
}

const total = rows.length;
console.log(
  `Done. total: ${total}, cache_hit: ${cacheHit}, seeded_fingerprint: ${seeded}, measured: ${measured}, ffmpeg_failed: ${ffmpegFailed}, invalid_url: ${invalidPath}, file_not_found: ${fileNotFound}${
    force ? " (force)" : ""
  }`,
);
