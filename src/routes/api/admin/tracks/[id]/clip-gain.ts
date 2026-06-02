import { define } from "../../../../../utils.ts";
import { db } from "../../../../../db/db.ts";
import { requireAdminSessionOrRedirect } from "../../../../../lib/adminSession.ts";
import { absolutePathFromTracksAudioUrl } from "../../../../../lib/audioFilePath.ts";
import { measureClipGainDb } from "../../../../../lib/playbackGainAnalysis.ts";
import {
  resolveMaxPlaySeconds,
  resolvePlayStartSeconds,
} from "../../../../../lib/quizPlayback.ts";

/**
 * Admin-only: measure clip-window gain for an (unsaved) `start`/`max` window so
 * the track-edit preview can reflect live form values. Does not persist —
 * the saved clip gain is recomputed on track save.
 */
export const handler = define.handlers({
  async GET(ctx) {
    const gate = requireAdminSessionOrRedirect(ctx);
    if (gate instanceof Response) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    const id = ctx.params.id;
    if (!id) return Response.json({ error: "not_found" }, { status: 404 });

    const url = new URL(ctx.req.url);
    const startSeconds = resolvePlayStartSeconds(
      Number(url.searchParams.get("start")),
    );
    const maxSeconds = resolveMaxPlaySeconds(
      Number(url.searchParams.get("max")),
    );

    const row = await db.query.tracks.findFirst({
      where: { id },
      columns: { audioUrl: true },
    });
    if (!row) return Response.json({ error: "not_found" }, { status: 404 });

    let absolutePath: string;
    try {
      absolutePath = absolutePathFromTracksAudioUrl(row.audioUrl);
    } catch {
      return Response.json({ error: "invalid_audio_url" }, { status: 404 });
    }

    const clipPlaybackGainDb = await measureClipGainDb(
      absolutePath,
      startSeconds,
      maxSeconds,
    );
    if (clipPlaybackGainDb === null) {
      return Response.json({ error: "measurement_failed" }, { status: 500 });
    }

    return Response.json({ clipPlaybackGainDb });
  },
});
