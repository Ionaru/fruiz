import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { collectedTracks } from "../../../db/schema.ts";
import { getCategoryCollectionStats } from "../../../lib/collections.ts";
import { collectionTrackAddedCounter } from "../../../lib/telemetry.ts";

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

    const insertResult = await db
      .insert(collectedTracks)
      .values({ userId: user.id, trackId, collectedAt: new Date() })
      .onConflictDoNothing()
      .returning({ trackId: collectedTracks.trackId });

    const created = insertResult.length > 0;

    const url = new URL(ctx.req.url);
    const categorySlug = url.searchParams.get("categorySlug");
    const progress = categorySlug
      ? await getCategoryCollectionStats(db, user.id, categorySlug)
      : null;

    if (created) {
      collectionTrackAddedCounter.add(
        1,
        categorySlug ? { category: categorySlug } : {},
      );
    }

    return Response.json(
      { status: created ? "created" : "existed", progress },
      { status: created ? 201 : 200 },
    );
  },
});
