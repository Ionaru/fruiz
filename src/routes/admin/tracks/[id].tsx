import { Head } from "fresh/runtime";
import { eq } from "drizzle-orm";
import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { trackCategories, tracks } from "../../../db/schema.ts";
import { requireAdminSessionOrRedirect } from "../../../lib/adminSession.ts";
import { listAudioFilesInMusicDir } from "../../../lib/listMusicDir.ts";
import { AdminBackLink } from "../../../components/admin/AdminBackLink.tsx";
import { AdminPageShell } from "../../../components/admin/AdminPageShell.tsx";
import { DangerZoneDeleteForm } from "../../../components/admin/DangerZoneDeleteForm.tsx";
import { InlineAlert } from "../../../components/ui/InlineAlert.tsx";
import TrackForm from "../../../islands/TrackForm.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const gate = requireAdminSessionOrRedirect(ctx);
    if (gate instanceof Response) return gate;
    const audioChoices = await listAudioFilesInMusicDir();
    const id = ctx.params.id;
    const trackWithCategories = await db.query.tracks.findFirst({
      where: { id },
      with: { categories: true },
    });
    if (!trackWithCategories) {
      return Response.redirect(new URL("/admin/tracks", ctx.req.url).href, 302);
    }
    const { categories: linkedCategories, ...track } = trackWithCategories;
    const categoryOptions = await db.query.categories.findMany({
      columns: { id: true, name: true, slug: true },
      orderBy: (categoryRow, { asc }) => asc(categoryRow.name),
    });
    const selectedCategoryIds = linkedCategories.map((link) => link.id);
    const queryError = new URL(ctx.req.url).searchParams.get("err");
    return {
      data: {
        session: gate.session,
        track,
        categoryOptions,
        audioChoices,
        selectedCategoryIds,
        queryError,
      },
    };
  },

  async POST(ctx) {
    const gate = requireAdminSessionOrRedirect(ctx);
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
    const audioUrl = String(form.get("audioUrl") ?? "").trim().replaceAll(
      "\\",
      "/",
    );
    const difficulty = String(form.get("difficulty") ?? "");
    const categoryIds = form.getAll("categoryIds").map((v) => String(v));
    const audioChoices = await listAudioFilesInMusicDir();
    const validAudioChoices = new Set(audioChoices);
    if (
      !title || !audioUrl || !validAudioChoices.has(audioUrl) ||
      (difficulty !== "easy" && difficulty !== "hard")
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
  <AdminPageShell>
    <Head>
      <title>{data.track.title} — track</title>
    </Head>
    <AdminBackLink href="/admin/tracks" />
    <h1 class="text-2xl font-semibold text-base-900 dark:text-base-100">
      Edit track
    </h1>
    {data.queryError === "confirm" && (
      <InlineAlert variant="error" role="alert">
        Type DELETE to confirm removal.
      </InlineAlert>
    )}
    <div class="mx-auto flex w-full flex-col gap-6">
      <TrackForm
        action={`/admin/tracks/${data.track.id}`}
        categories={data.categoryOptions}
        audioChoices={data.audioChoices}
        selectedCategoryIds={data.selectedCategoryIds}
        defaultTitle={data.track.title}
        defaultAudioUrl={data.track.audioUrl}
        defaultDifficulty={data.track.difficulty}
        submitLabel="Save changes"
      />
      <DangerZoneDeleteForm
        action={`/admin/tracks/${data.track.id}`}
        confirmInputId="confirm-del-track"
        submitLabel="Delete track"
      />
    </div>
  </AdminPageShell>
));
