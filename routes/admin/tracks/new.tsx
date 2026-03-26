import { Head } from "fresh/runtime";
import { asc } from "drizzle-orm";
import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { categories, trackCategories, tracks } from "../../../db/schema.ts";
import { requireAdminSessionOrRedirect } from "../../../lib/adminSession.ts";
import { TrackForm } from "../../../components/admin/TrackForm.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const gate = await requireAdminSessionOrRedirect(ctx.req);
    if (gate instanceof Response) return gate;
    const categoryOptions = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(categories)
      .orderBy(asc(categories.name));
    return { data: { session: gate.session, categoryOptions } };
  },

  async POST(ctx) {
    const gate = await requireAdminSessionOrRedirect(ctx.req);
    if (gate instanceof Response) return gate;
    const form = await ctx.req.formData();
    const title = String(form.get("title") ?? "").trim();
    const audioUrl = String(form.get("audioUrl") ?? "").trim();
    const difficulty = String(form.get("difficulty") ?? "");
    const categoryIds = form.getAll("categoryIds").map((v) => String(v));
    if (
      !title || !audioUrl || (difficulty !== "easy" && difficulty !== "hard")
    ) {
      return Response.redirect(
        new URL("/admin/tracks/new", ctx.req.url).href,
        302,
      );
    }
    const trackId = crypto.randomUUID();
    await db.insert(tracks).values({
      id: trackId,
      title,
      audioUrl,
      difficulty,
    });
    if (categoryIds.length > 0) {
      await db.insert(trackCategories).values(
        categoryIds.map((categoryId) => ({ trackId, categoryId })),
      );
    }
    return Response.redirect(new URL("/admin/tracks", ctx.req.url).href, 302);
  },
});

export default define.page<typeof handler>(({ data }) => (
  <div class="min-h-screen bg-base-200 dark:bg-base-800 px-4 py-8">
    <Head>
      <title>New track — admin</title>
    </Head>
    <div class="max-w-xl mx-auto flex flex-col gap-6">
      <a
        href="/admin/tracks"
        class="plateau rounded-full px-4 py-2 text-sm no-underline text-inherit w-fit"
      >
        Back
      </a>
      <h1 class="text-2xl font-semibold">New track</h1>
      <TrackForm
        action="/admin/tracks/new"
        categories={data.categoryOptions}
        submitLabel="Create track"
      />
    </div>
  </div>
));
