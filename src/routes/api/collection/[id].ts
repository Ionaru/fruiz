import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { collectedTracks } from "../../../db/schema.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const user = ctx.state.session.user;
    if (!user) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const trackId = ctx.params.id;
    if (!trackId) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    const track = await db.query.tracks.findFirst({
      where: { id: trackId },
      columns: { id: true },
    });
    if (!track) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    const result = await db
      .insert(collectedTracks)
      .values({ userId: user.id, trackId, collectedAt: new Date() })
      .onConflictDoNothing()
      .returning({ trackId: collectedTracks.trackId });

    const created = result.length > 0;
    return Response.json(
      { status: created ? "created" : "existed" },
      { status: created ? 201 : 200 },
    );
  },
});
