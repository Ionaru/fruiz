import { Head } from "fresh/runtime";
import { AdminPageShell } from "../../components/admin/AdminPageShell.tsx";
import { define } from "../../utils.ts";
import { db } from "../../db/db.ts";
import { listAdminCategories, listAdminTracks } from "../../lib/adminReads.ts";
import { requireAdminSessionOrRedirect } from "../../lib/adminSession.ts";
import { HomeButton } from "../../components/ui/HomeButton.tsx";
import { AccountButton } from "../../components/ui/AccountButton.tsx";
import { ManageCategoriesButton } from "../../components/admin/ManageCategoriesButton.tsx";
import { ManageTracksButton } from "../../components/admin/ManageTracksButton.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const gate = requireAdminSessionOrRedirect(ctx);
    if (gate instanceof Response) return gate;
    const catRows = await listAdminCategories(db);
    const trackRows = await listAdminTracks(db);
    return {
      data: {
        session: gate.session,
        categories: catRows,
        tracks: trackRows,
      },
    };
  },
});

export default define.page<typeof handler>(({ data }) => (
  <AdminPageShell>
    <Head>
      <title>Admin — fruiz</title>
    </Head>
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm opacity-80 text-base-800 dark:text-base-100">
          Signed in as
        </p>
        <p class="text-lg font-semibold text-base-900 dark:text-base-100">
          {data.session.username}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <HomeButton />
        <AccountButton />
      </div>
    </header>
    <section class="plateau rounded-2xl p-5 space-y-3">
      <h2 class="text-lg font-medium text-base-900 dark:text-base-100">
        Library
      </h2>
      <p class="text-sm opacity-90 text-base-800 dark:text-base-100">
        {data.categories.length} categories · {data.tracks.length} tracks
      </p>
      <div class="flex flex-wrap gap-2">
        <ManageCategoriesButton />
        <ManageTracksButton />
      </div>
    </section>
  </AdminPageShell>
));
