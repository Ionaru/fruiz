import { Head } from "fresh/runtime";
import { AdminListHeader } from "../../../components/admin/AdminListHeader.tsx";
import { AdminPageShell } from "../../../components/admin/AdminPageShell.tsx";
import { AdminTrackListItem } from "../../../components/admin/AdminTrackListItem.tsx";
import { AdminUnlinkedAudioListItem } from "../../../components/admin/AdminUnlinkedAudioListItem.tsx";
import { AudioPlayer } from "../../../islands/AudioPlayer.tsx";
import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { requireAdminSessionOrRedirect } from "../../../lib/adminSession.ts";
import { listUnlinkedAudioFiles } from "../../../lib/adminReads.ts";
import { resolvedPlaybackFromDbFields } from "../../../lib/quizPlayback.ts";
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
    const unlinkedAudioFiles = await listUnlinkedAudioFiles(db);
    return {
      data: {
        session: gate.session,
        tracks: tracksWithCategories,
        unlinkedAudioFiles,
      },
    };
  },
});

export default define.page<typeof handler>(({ data, state, url }) => (
  <AdminPageShell user={state.session.user} currentPath={url.pathname}>
    <Head>
      <title>Tracks — admin</title>
    </Head>
    <AdminListHeader title="Tracks" actions={<NewTrackButton />} />
    {data.unlinkedAudioFiles.length > 0 && (
      <section class="flex flex-col gap-2">
        <h2 class="text-lg font-medium text-base-900 dark:text-base-100">
          Unlinked audio files ({data.unlinkedAudioFiles.length})
        </h2>
        <p class="text-sm opacity-80">
          Files in <code>data/music</code> with no track yet, newest first.
        </p>
        <ul class="flex flex-col gap-2">
          {data.unlinkedAudioFiles.map((audioFile) => (
            <AdminUnlinkedAudioListItem
              key={audioFile.audioUrl}
              audioUrl={audioFile.audioUrl}
            />
          ))}
        </ul>
      </section>
    )}
    <section class="flex flex-col gap-2">
      <h2 class="text-lg font-medium text-base-900 dark:text-base-100">
        All tracks
      </h2>
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
    </section>
  </AdminPageShell>
));
