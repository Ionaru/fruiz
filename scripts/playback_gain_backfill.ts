/**
 * Recomputes `playback_gain_db` for every track. Requires `ffmpeg` on PATH.
 * Run from repo root: `deno task playback-gain:backfill`
 */
import { db } from "../src/db/db.ts";
import { analyzeAndStorePlaybackGainForTrack } from "../src/lib/playbackGainAnalysis.ts";

const rows = await db.query.tracks.findMany({
  columns: { id: true, audioUrl: true, title: true },
});

let ok = 0;
let skipped = 0;
for (const row of rows) {
  await analyzeAndStorePlaybackGainForTrack(db, row.id, row.audioUrl);
  const after = await db.query.tracks.findFirst({
    where: { id: row.id },
    columns: { playbackGainDb: true },
  });
  if (after?.playbackGainDb != null) {
    ok++;
    console.log(`"${row.title}" (${row.id}): ${after.playbackGainDb} dB`);
  } else {
    skipped++;
    console.warn(
      `Skipped "${row.title}" (${row.id}) — ffmpeg failed or not installed`,
    );
  }
}

console.log(
  `Done. Measured: ${ok}, skipped: ${skipped}, total: ${rows.length}`,
);
