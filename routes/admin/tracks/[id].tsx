import { Head } from "fresh/runtime";
import { asc, eq } from "drizzle-orm";
import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { categories, trackCategories, tracks } from "../../../db/schema.ts";
import { requireAdminSessionOrRedirect } from "../../../lib/adminSession.ts";
import { TrackForm } from "../../../components/admin/TrackForm.tsx";
import { Button } from "../../../components/Button.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const gate = await requireAdminSessionOrRedirect(ctx.req);
    if (gate instanceof Response) return gate;
    const id = ctx.params.id;
    const [track] = await db.select().from(tracks).where(eq(tracks.id, id))
      .limit(1);
    if (!track) {
      return Response.redirect(new URL("/admin/tracks", ctx.req.url).href, 302);
    }
    const categoryOptions = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(categories)
      .orderBy(asc(categories.name));
    const links = await db
      .select({ categoryId: trackCategories.categoryId })
      .from(trackCategories)
      .where(eq(trackCategories.trackId, id));
    const selectedCategoryIds = links.map((l) => l.categoryId);
    const queryError = new URL(ctx.req.url).searchParams.get("err");
    return {
      data: {
        session: gate.session,
        track,
        categoryOptions,
        selectedCategoryIds,
        queryError,
      },
    };
  },

  async POST(ctx) {
    const gate = await requireAdminSessionOrRedirect(ctx.req);
    if (gate instanceof Response) return gate;
    const id = ctx.params.id;
    const form = await ctx.req.formData();
    const intent = String(form.get("intent") ?? "");

    if (intent === "delete") {
      const confirm = String(form.get("confirm") ?? "");
      if (confirm !== "DELETE") {
        return Response.redirect(
          new URL(`/admin/tracks/${id}?err=confirm`, ctx.req.url).href,
          302,
        );
      }
      await db.delete(trackCategories).where(eq(trackCategories.trackId, id));
      await db.delete(tracks).where(eq(tracks.id, id));
      return Response.redirect(new URL("/admin/tracks", ctx.req.url).href, 302);
    }

    const title = String(form.get("title") ?? "").trim();
    const audioUrl = String(form.get("audioUrl") ?? "").trim();
    const difficulty = String(form.get("difficulty") ?? "");
    const categoryIds = form.getAll("categoryIds").map((v) => String(v));
    if (
      !title || !audioUrl || (difficulty !== "easy" && difficulty !== "hard")
    ) {
      return Response.redirect(
        new URL(`/admin/tracks/${id}`, ctx.req.url).href,
        302,
      );
    }
    await db.update(tracks).set({ title, audioUrl, difficulty }).where(
      eq(tracks.id, id),
    );
    await db.delete(trackCategories).where(eq(trackCategories.trackId, id));
    if (categoryIds.length > 0) {
      await db.insert(trackCategories).values(
        categoryIds.map((categoryId) => ({ trackId: id, categoryId })),
      );
    }
    return Response.redirect(
      new URL(`/admin/tracks/${id}`, ctx.req.url).href,
      302,
    );
  },
});

export default define.page<typeof handler>(({ data }) => (
  <div class="min-h-screen bg-base-200 dark:bg-base-800 px-4 py-8">
    <Head>
      <title>{data.track.title} — track</title>
    </Head>
    <div class="max-w-xl mx-auto flex flex-col gap-6">
      <a
        href="/admin/tracks"
        class="plateau rounded-full px-4 py-2 text-sm no-underline text-inherit w-fit"
      >
        Back
      </a>
      <h1 class="text-2xl font-semibold">Edit track</h1>
      {data.queryError === "confirm" && (
        <p class="text-sm text-red-800 dark:text-red-200" role="alert">
          Type DELETE to confirm removal.
        </p>
      )}
      <TrackForm
        action={`/admin/tracks/${data.track.id}`}
        categories={data.categoryOptions}
        selectedCategoryIds={data.selectedCategoryIds}
        defaultTitle={data.track.title}
        defaultAudioUrl={data.track.audioUrl}
        defaultDifficulty={data.track.difficulty}
        submitLabel="Save changes"
      />
      <form
        method="post"
        action={`/admin/tracks/${data.track.id}`}
        class="plateau rounded-2xl p-5 space-y-3 border border-red-900/20"
      >
        <input type="hidden" name="intent" value="delete" />
        <p class="text-sm font-medium text-red-900 dark:text-red-200">
          Danger zone
        </p>
        <label class="block text-sm" for="confirm-del-track">
          Type <code>DELETE</code> to confirm
        </label>
        <input
          id="confirm-del-track"
          name="confirm"
          class="plateau rounded-xl px-3 py-2 w-full border-0 bg-transparent"
          autocomplete="off"
        />
        <Button type="submit" variant="danger" class="w-full">
          Delete track
        </Button>
      </form>
    </div>
  </div>
));
