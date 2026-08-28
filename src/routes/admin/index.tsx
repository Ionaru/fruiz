import { Head } from "fresh/runtime";
import { AdminPageShell } from "../../components/admin/AdminPageShell.tsx";
import { define } from "../../utils.ts";
import { db } from "../../db/db.ts";
import { listAdminCategories, listAdminTracks } from "../../lib/adminReads.ts";
import { requireAdminSessionOrRedirect } from "../../lib/adminSession.ts";
import { countPendingSuggestions } from "../../lib/trackSuggestions.ts";
import { ManageCategoriesButton } from "../../components/admin/ManageCategoriesButton.tsx";
import { ManageTracksButton } from "../../components/admin/ManageTracksButton.tsx";
import { ManageSuggestionsButton } from "../../components/admin/ManageSuggestionsButton.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const gate = requireAdminSessionOrRedirect(ctx);
    if (gate instanceof Response) return gate;
    const catRows = await listAdminCategories(db);
    const trackRows = await listAdminTracks(db);
    const pendingSuggestions = await countPendingSuggestions(db);
    return {
      data: {
        session: gate.session,
        categories: catRows,
        tracks: trackRows,
        pendingSuggestions,
      },
    };
  },
});

export default define.page<typeof handler>(({ data, state, url }) => (
  <AdminPageShell user={state.session.user} currentPath={url.pathname}>
    <Head>
      <title>Admin — fruiz</title>
    </Head>
    <div>
      <h1 class="text-2xl font-semibold text-base-900 dark:text-base-100">
        Admin
      </h1>
      <p class="mt-2 text-sm opacity-80 text-base-800 dark:text-base-100">
        Signed in as
      </p>
      <p class="text-lg font-semibold text-base-900 dark:text-base-100">
        {data.session.username}
      </p>
    </div>
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
    <section class="plateau rounded-2xl p-5 space-y-3">
      <h2 class="text-lg font-medium text-base-900 dark:text-base-100">
        Suggestions
      </h2>
      <p class="text-sm opacity-90 text-base-800 dark:text-base-100">
        {data.pendingSuggestions} pending review
      </p>
      <div class="flex flex-wrap gap-2">
        <ManageSuggestionsButton />
      </div>
    </section>
  </AdminPageShell>
));
