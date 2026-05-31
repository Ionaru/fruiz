import { Head } from "fresh/runtime";
import { eq } from "drizzle-orm";
import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { trackCategories, tracks } from "../../../db/schema.ts";
import { requireAdminSessionOrRedirect } from "../../../lib/adminSession.ts";
import { listAudioFilesInMusicDir } from "../../../lib/listMusicDir.ts";
import {
  analyzeAndStorePlaybackGainForTrack,
  fingerprintFromFileInfo,
} from "../../../lib/playbackGainAnalysis.ts";
import { absolutePathFromTracksAudioUrl } from "../../../lib/audioFilePath.ts";
import {
  parseTrackPlaybackFormFields,
  resolvedPlaybackFromDbFields,
} from "../../../lib/quizPlayback.ts";
import { AdminBackLink } from "../../../components/admin/AdminBackLink.tsx";
import { AdminPageShell } from "../../../components/admin/AdminPageShell.tsx";
import { DangerZoneDeleteForm } from "../../../components/admin/DangerZoneDeleteForm.tsx";
import { InlineAlert } from "../../../components/ui/InlineAlert.tsx";
import { PlateauCard } from "../../../components/ui/PlateauCard.tsx";
import { ClipGainPreview } from "../../../islands/ClipGainPreview.tsx";
import TrackForm from "../../../islands/TrackForm.tsx";

const TRACK_EDIT_FORM_ID = "track-edit-form";

function formatGainDb(db: number | null): string {
  return db === null ? "n/a" : `${db.toFixed(1)} dB`;
}

export const handler = define.handlers({
  async GET(ctx) {
    const gate = requireAdminSessionOrRedirect(ctx);
    if (gate instanceof Response) return gate;
    if (!ctx.params.id) {
      return Response.redirect(new URL("/admin/tracks", ctx.req.url).href, 302);
    }
    const id = ctx.params.id;
    const audioChoices = await listAudioFilesInMusicDir();
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
    if (!ctx.params.id) {
      return Response.redirect(new URL("/admin/tracks", ctx.req.url).href, 302);
    }
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
    const categoryIds = form.getAll("categoryIds").map(String);
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
    const playbackParsed = parseTrackPlaybackFormFields(form);
    if (!playbackParsed.ok) {
      return Response.redirect(
        new URL(`/admin/tracks/${id}?err=playback`, ctx.req.url).href,
        302,
      );
    }
    const existingTrack = await db.query.tracks.findFirst({
      where: { id },
      columns: { audioUrl: true },
    });
    const audioUrlChanged = existingTrack?.audioUrl !== audioUrl;

    const freshFingerprint = await (async () => {
      if (!audioUrlChanged) return {};
      try {
        const absolutePath = absolutePathFromTracksAudioUrl(audioUrl);
        const fileInfo = await Deno.stat(absolutePath);
        const fp = fingerprintFromFileInfo(fileInfo);
        return {
          playbackGainSourceSize: fp?.size ?? null,
          playbackGainSourceMtimeMs: fp?.mtimeMs ?? null,
          playbackGainDb: null,
          // The clip gain was measured against the old file/window — invalidate
          // it too so analyze re-measures it (not just the full-track gain).
          clipPlaybackGainDb: null,
          clipPlaybackGainStartSeconds: null,
          clipPlaybackGainMaxSeconds: null,
        };
      } catch {
        return {
          playbackGainSourceSize: null,
          playbackGainSourceMtimeMs: null,
          playbackGainDb: null,
          clipPlaybackGainDb: null,
          clipPlaybackGainStartSeconds: null,
          clipPlaybackGainMaxSeconds: null,
        };
      }
    })();

    await db.update(tracks).set({
      title,
      audioUrl,
      difficulty,
      playStartSeconds: playbackParsed.playStartSeconds,
      maxPlaySeconds: playbackParsed.maxPlaySeconds,
      ...freshFingerprint,
    }).where(
      eq(tracks.id, id),
    );
    await db.delete(trackCategories).where(eq(trackCategories.trackId, id));
    if (categoryIds.length > 0) {
      await db.insert(trackCategories).values(
        categoryIds.map((categoryId) => ({ trackId: id, categoryId })),
      );
    }
    await analyzeAndStorePlaybackGainForTrack(db, id, audioUrl);
    return Response.redirect(
      new URL(`/admin/tracks`, ctx.req.url).href,
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
    {data.queryError === "playback" && (
      <InlineAlert variant="error" role="alert">
        Fix playback start and max length: use non-negative start and a max
        length of at least 2.5 seconds.
      </InlineAlert>
    )}
    <div class="mx-auto flex w-full flex-col gap-6">
      <p class="text-sm opacity-80">
        {data.track.playbackGainDb === null &&
            data.track.clipPlaybackGainDb === null
          ? "Playback loudness not measured yet. Saving this track runs analysis when ffmpeg is on PATH; or run `deno task playback-gain:backfill`."
          : `Playback gain toward -16 LUFS — full track: ${
            formatGainDb(data.track.playbackGainDb)
          }; quiz clip: ${formatGainDb(data.track.clipPlaybackGainDb)}`}
      </p>
      <TrackForm
        action={`/admin/tracks/${data.track.id}`}
        categories={data.categoryOptions}
        audioChoices={data.audioChoices}
        selectedCategoryIds={data.selectedCategoryIds}
        defaultTitle={data.track.title}
        defaultAudioUrl={data.track.audioUrl}
        defaultDifficulty={data.track.difficulty}
        defaultPlayStartSeconds={data.track.playStartSeconds}
        defaultMaxPlaySeconds={data.track.maxPlaySeconds}
        formDomId={TRACK_EDIT_FORM_ID}
        submitLabel="Save changes"
      />
      <PlateauCard class="w-full" padding="5">
        <h2 class="text-lg font-semibold text-base-900 dark:text-base-100">
          Playback preview
        </h2>
        <p class="text-sm opacity-80 mb-4">
          Play uses the playback start and max length fields in the form above,
          including changes you have not saved yet.
        </p>
        <ClipGainPreview
          audioId={data.track.id}
          initialClipGainDb={data.track.clipPlaybackGainDb}
          fullPlaybackGainDb={data.track.playbackGainDb}
          {...resolvedPlaybackFromDbFields({
            playStartSeconds: data.track.playStartSeconds,
            maxPlaySeconds: data.track.maxPlaySeconds,
          })}
          playbackGainSourceSize={data.track.playbackGainSourceSize}
          playbackGainSourceMtimeMs={data.track.playbackGainSourceMtimeMs}
          syncPlaybackFromFormId={TRACK_EDIT_FORM_ID}
          recalcUrl={`/api/admin/tracks/${data.track.id}/clip-gain`}
          measuredStartSeconds={data.track.clipPlaybackGainStartSeconds}
          measuredMaxSeconds={data.track.clipPlaybackGainMaxSeconds}
        />
      </PlateauCard>
      <DangerZoneDeleteForm
        action={`/admin/tracks/${data.track.id}`}
        confirmInputId="confirm-del-track"
        submitLabel="Delete track"
      />
    </div>
  </AdminPageShell>
));
