import { Head } from "fresh/runtime";
import { AdminListHeader } from "../../../components/admin/AdminListHeader.tsx";
import { AdminPageShell } from "../../../components/admin/AdminPageShell.tsx";
import { PlateauCard } from "../../../components/ui/PlateauCard.tsx";
import { PillLink } from "../../../components/ui/PillLink.tsx";
import { AudioPlayer } from "../../../islands/AudioPlayer.tsx";
import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { requireAdminSessionOrRedirect } from "../../../lib/adminSession.ts";
import { resolvedPlaybackFromDbFields } from "../../../lib/quizPlayback.ts";

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
          <PillLink href="/admin">
            Dashboard
          </PillLink>
          <PillLink href="/admin/tracks/new">
            New track
          </PillLink>
        </>
      }
    />
    <ul class="flex flex-col gap-2">
      {data.tracks.map((track) => (
        <li key={track.id}>
          <PlateauCard
            padding="none"
            class="rounded-xl px-4 py-3 flex flex-wrap items-center gap-3"
          >
            <div class="shrink-0">
              <AudioPlayer
                audioId={track.id}
                compact
                playbackGainDb={track.playbackGainDb}
                {...resolvedPlaybackFromDbFields({
                  playStartSeconds: track.playStartSeconds,
                  maxPlaySeconds: track.maxPlaySeconds,
                })}
              />
            </div>
            <a
              href={`/admin/tracks/${track.id}`}
              class="grid flex-1 min-w-0 items-center gap-2 no-underline grid-cols-[minmax(0,1fr)_5rem_8.5rem] md:grid-cols-[minmax(0,1fr)_6rem_12rem]"
            >
              <span class="font-medium min-w-0 truncate">{track.title}</span>
              <span class="text-sm opacity-80 capitalize text-right">
                {track.difficulty}
              </span>
              {track.categoryNames.length > 0
                ? (
                  <div class="text-xs opacity-70 flex flex-col gap-1 items-end">
                    {track.categoryNames.map((category) => (
                      <span class="bg-blue-300 dark:bg-blue-900 px-1.5 py-0.5 rounded-md w-max">
                        {category}
                      </span>
                    ))}
                  </div>
                )
                : (
                  <span class="text-xs opacity-70 text-right truncate">
                    <span class="bg-red-300 dark:bg-red-900 px-1.5 py-0.5 rounded-md">
                      Uncategorized
                    </span>
                  </span>
                )}
            </a>
          </PlateauCard>
        </li>
      ))}
    </ul>
    {data.tracks.length === 0 && (
      <p class="text-sm opacity-80">No tracks yet.</p>
    )}
  </AdminPageShell>
));
