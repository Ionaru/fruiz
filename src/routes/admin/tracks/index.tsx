import { Head } from "fresh/runtime";
import { AdminListHeader } from "../../../components/admin/AdminListHeader.tsx";
import { AdminPageShell } from "../../../components/admin/AdminPageShell.tsx";
import { AdminTrackListItem } from "../../../components/admin/AdminTrackListItem.tsx";
import { AudioPlayer } from "../../../islands/AudioPlayer.tsx";
import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { requireAdminSessionOrRedirect } from "../../../lib/adminSession.ts";
import { resolvedPlaybackFromDbFields } from "../../../lib/quizPlayback.ts";
import { AdminButton } from "../../../components/ui/AdminButton.tsx";
import { NewTrackButton } from "../../../components/admin/NewTrackButton.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const gate = requireAdminSessionOrRedirect(ctx);
    if (gate instanceof Response) return gate;
    const trackRows = await db.query.tracks.findMany({
      orderBy: (trackRow, { asc }) => asc(trackRow.title),
      with: { categories: true },
    });
    const tracksWithCategories = trackRows.map((trackRow) => {
      const { categories: categoryRows, ...track } = trackRow;
      return {
        ...track,
        categoryNames: categoryRows.map((categoryRow) => categoryRow.name),
      };
    });
    return { data: { session: gate.session, tracks: tracksWithCategories } };
  },
});

export default define.page<typeof handler>(({ data }) => (
  <AdminPageShell>
    <Head>
      <title>Tracks — admin</title>
    </Head>
    <AdminListHeader
      title="Tracks"
      actions={
        <>
          <AdminButton />
          <NewTrackButton />
        </>
      }
    />
    <ul class="flex flex-col gap-2">
      {data.tracks.map((track) => (
        <AdminTrackListItem
          key={track.id}
          id={track.id}
          title={track.title}
          difficulty={track.difficulty}
          categoryNames={track.categoryNames}
        >
          <AudioPlayer
            audioId={track.id}
            compact
            playbackGainDb={track.playbackGainDb}
            {...resolvedPlaybackFromDbFields({
              playStartSeconds: track.playStartSeconds,
              maxPlaySeconds: track.maxPlaySeconds,
            })}
            playbackGainSourceSize={track.playbackGainSourceSize}
            playbackGainSourceMtimeMs={track.playbackGainSourceMtimeMs}
            lazyLoad
          />
        </AdminTrackListItem>
      ))}
    </ul>
    {data.tracks.length === 0 && (
      <p class="text-sm opacity-80">No tracks yet.</p>
    )}
  </AdminPageShell>
));
