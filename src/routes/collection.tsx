import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { db } from "../db/db.ts";
import { PageShell } from "../components/layout/PageShell.tsx";
import { PlateauCard } from "../components/ui/PlateauCard.tsx";
import CollectionView from "../islands/CollectionView.tsx";
import { HomeButton } from "../components/ui/HomeButton.tsx";
import { AccountButton } from "../components/ui/AccountButton.tsx";
import {
  getCategorizedTrackCount,
  getCollectionStatsByCategory,
} from "../lib/collections.ts";

export interface CollectionTrack {
  id: string;
  title: string;
  audioUrl: string;
  playbackGainDb: number | null;
  categories: string[];
  playbackGainSourceSize: number | null;
  playbackGainSourceMtimeMs: number | null;
}

export interface CategoryCount {
  collected: number;
  total: number;
}

export const handler = define.handlers({
  async GET(ctx) {
    const user = ctx.state.session.user;
    if (!user) {
      return ctx.redirect("/account");
    }

    const [rows, stats, totalTracks] = await Promise.all([
      db.query.collectedTracks.findMany({
        where: { userId: user.id },
        orderBy: { collectedAt: "desc" },
        with: {
          track: {
            columns: {
              id: true,
              title: true,
              audioUrl: true,
              playbackGainDb: true,
              playbackGainSourceSize: true,
              playbackGainSourceMtimeMs: true,
            },
            with: { categories: { columns: { name: true } } },
          },
        },
      }),
      getCollectionStatsByCategory(db, user.id),
      getCategorizedTrackCount(db),
    ]);

    const collectionTracks: CollectionTrack[] = [];
    for (const row of rows) {
      if (!row.track) continue;
      collectionTracks.push({
        id: row.track.id,
        title: row.track.title,
        audioUrl: row.track.audioUrl,
        playbackGainDb: row.track.playbackGainDb,
        categories: row.track.categories.map((cat) => cat.name),
        playbackGainSourceSize: row.track.playbackGainSourceSize,
        playbackGainSourceMtimeMs: row.track.playbackGainSourceMtimeMs,
      });
    }

    const categoryCounts: Record<string, CategoryCount> = {};
    for (const stat of stats) {
      categoryCounts[stat.categoryName] = {
        collected: stat.collected,
        total: stat.total,
      };
    }

    const allTotals = {
      collected: collectionTracks.length,
      total: totalTracks,
    };

    return { data: { tracks: collectionTracks, categoryCounts, allTotals } };
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
          <HomeButton />
          <AccountButton />
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
        : (
          <CollectionView
            tracks={data.tracks}
            categoryCounts={data.categoryCounts}
            allTotals={data.allTotals}
          />
        )}
    </div>
  </PageShell>
));
