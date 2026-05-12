import { define } from "../../../../utils.ts";
import { db } from "../../../../db/db.ts";
import {
  getCategoryBySlugOrId,
  getTrackTitlesWithDifficultyForCategory,
} from "../../../../lib/categories.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const key = ctx.params.key;
    if (!key) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    const category = await getCategoryBySlugOrId(db, key);
    if (!category) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    const trackList = await getTrackTitlesWithDifficultyForCategory(
      db,
      category.id,
    );
    return Response.json({ category, tracks: trackList });
  },
});
