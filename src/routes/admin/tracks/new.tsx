import { Head } from "fresh/runtime";
import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { trackCategories, tracks } from "../../../db/schema.ts";
import { listAdminCategories } from "../../../lib/adminReads.ts";
import { requireAdminSessionOrRedirect } from "../../../lib/adminSession.ts";
import { listAudioFilesInMusicDir } from "../../../lib/listMusicDir.ts";
import { analyzeAndStorePlaybackGainForTrack } from "../../../lib/playbackGainAnalysis.ts";
import { AdminBackLink } from "../../../components/admin/AdminBackLink.tsx";
import { AdminPageShell } from "../../../components/admin/AdminPageShell.tsx";
import TrackForm from "../../../islands/TrackForm.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const gate = requireAdminSessionOrRedirect(ctx);
    if (gate instanceof Response) return gate;
    const audioChoices = await listAudioFilesInMusicDir();
    const categoryOptions = await listAdminCategories(db);
    return { data: { session: gate.session, categoryOptions, audioChoices } };
  },

  async POST(ctx) {
    const gate = requireAdminSessionOrRedirect(ctx);
    if (gate instanceof Response) return gate;
    const form = await ctx.req.formData();
    const title = String(form.get("title") ?? "").trim();
    const audioUrl = String(form.get("audioUrl") ?? "").trim().replaceAll(
      "\\",
      "/",
    );
    const difficulty = String(form.get("difficulty") ?? "");
    const categoryIds = form.getAll("categoryIds").map(String);
    const audioChoices = await listAudioFilesInMusicDir();
    const validAudioChoices = new Set(audioChoices);
    if (
      !title || !audioUrl || !validAudioChoices.has(audioUrl) ||
      (difficulty !== "easy" && difficulty !== "hard")
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
    await analyzeAndStorePlaybackGainForTrack(db, trackId, audioUrl);
    return Response.redirect(new URL("/admin/tracks", ctx.req.url).href, 302);
  },
});

export default define.page<typeof handler>(({ data }) => (
  <AdminPageShell>
    <Head>
      <title>New track — admin</title>
    </Head>
    <AdminBackLink href="/admin/tracks" />
    <h1 class="text-2xl font-semibold text-base-900 dark:text-base-100">
      New track
    </h1>
    <div class="mx-auto w-full">
      <TrackForm
        action="/admin/tracks/new"
        categories={data.categoryOptions}
        audioChoices={data.audioChoices}
        submitLabel="Create track"
      />
    </div>
  </AdminPageShell>
));
