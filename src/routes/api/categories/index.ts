import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { listAdminCategories } from "../../../lib/adminReads.ts";

export const handler = define.handlers({
  async GET() {
    const rows = await listAdminCategories(db);
    return Response.json({
      categories: rows.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
      })),
    });
  },
});
