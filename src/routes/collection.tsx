import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { db } from "../db/db.ts";
import { PageShell } from "../components/layout/PageShell.tsx";
import { PlateauCard } from "../components/ui/PlateauCard.tsx";
import { PillLink } from "../components/ui/PillLink.tsx";
import CollectionView from "../islands/CollectionView.tsx";

export interface CollectionTrack {
  id: string;
  title: string;
  audioUrl: string;
  playbackGainDb: number | null;
  categories: string[];
}

export const handler = define.handlers({
  async GET(ctx) {
    const user = ctx.state.session.user;
    if (!user) {
      return ctx.redirect("/account");
    }

    const rows = await db.query.collectedTracks.findMany({
      where: { userId: user.id },
      orderBy: { collectedAt: "desc" },
      with: {
        track: {
          columns: {
            id: true,
            title: true,
            audioUrl: true,
            playbackGainDb: true,
          },
          with: { categories: { columns: { name: true } } },
        },
      },
    });

    const collectionTracks: CollectionTrack[] = [];
    for (const row of rows) {
      if (!row.track) continue;
      collectionTracks.push({
        id: row.track.id,
        title: row.track.title,
        audioUrl: row.track.audioUrl,
        playbackGainDb: row.track.playbackGainDb,
        categories: row.track.categories.map((cat) => cat.name),
      });
    }

    return { data: { tracks: collectionTracks } };
  },
});

export default define.page<typeof handler>(({ data }) => (
  <PageShell>
    <Head>
      <title>Collection — fruiz</title>
    </Head>
    <div class="max-w-xl mx-auto flex flex-col gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <h1 class="text-3xl font-semibold text-base-900 dark:text-base-100">
          Collection
        </h1>
        <nav class="flex flex-wrap gap-2">
          <PillLink href="/" class="text-base-900 dark:text-base-100">
            Home
          </PillLink>
          <PillLink href="/account" class="text-base-900 dark:text-base-100">
            Account
          </PillLink>
        </nav>
      </div>
      {data.tracks.length === 0
        ? (
          <PlateauCard class="text-base-800 dark:text-base-100">
            <p class="text-center">
              No tracks collected yet. Play some quizzes and guess correctly to
              build your collection!
            </p>
          </PlateauCard>
        )
        : <CollectionView tracks={data.tracks} />}
    </div>
  </PageShell>
));
