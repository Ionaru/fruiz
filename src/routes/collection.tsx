import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { db } from "../db/db.ts";
import { PageShell } from "../components/layout/PageShell.tsx";
import { SiteHeader } from "../components/layout/SiteHeader.tsx";
import { PlateauCard } from "../components/ui/PlateauCard.tsx";
import CollectionView from "../islands/CollectionView.tsx";
import type { CategoryFilterOption } from "../components/collection/CategoryFilterList.tsx";
import { toCollectionEntries } from "../lib/collectionEntries.ts";
import {
  getCategorizedTrackCount,
  getCollectionCatalog,
  getCollectionStatsForAllCategories,
} from "../lib/collections.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const user = ctx.state.session.user;
    if (!user) {
      return ctx.redirect("/account");
    }

    const [catalog, stats, totalTracks] = await Promise.all([
      getCollectionCatalog(db, user.id),
      getCollectionStatsForAllCategories(db, user.id),
      getCategorizedTrackCount(db),
    ]);

    // Titles of uncollected tracks are read here only to order the list and
    // pick a divider letter; the projection drops them before serialization.
    const entries = toCollectionEntries(catalog);

    const categories: CategoryFilterOption[] = stats
      .map((stat) => ({
        name: stat.categoryName,
        collected: stat.collected,
        total: stat.total,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    const allTotals = {
      collected: catalog.filter((track) => track.collected).length,
      total: totalTracks,
    };

    return { data: { entries, categories, allTotals } };
  },
});

export default define.page<typeof handler>(({ data, state, url }) => (
  <PageShell>
    <Head>
      <title>Collection — fruiz</title>
    </Head>
    <div class="mx-auto flex w-full max-w-xl flex-col gap-[18px] lg:max-w-[832px] lg:gap-6">
      <SiteHeader user={state.session.user} currentPath={url.pathname} />
      {data.entries.length === 0
        ? (
          <PlateauCard class="text-base-800 dark:text-base-100">
            <p class="text-center">
              There are no tracks to collect yet. Once an admin adds some, every
              one you guess correctly shows up here.
            </p>
          </PlateauCard>
        )
        : (
          <CollectionView
            entries={data.entries}
            categories={data.categories}
            allTotals={data.allTotals}
          />
        )}
    </div>
  </PageShell>
));
