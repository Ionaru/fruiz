import { Head } from "fresh/runtime";
import { asc } from "drizzle-orm";
import { define } from "../../utils.ts";
import { db } from "../../db/db.ts";
import { categories, tracks } from "../../db/schema.ts";
import { requireAdminSessionOrRedirect } from "../../lib/adminSession.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const gate = requireAdminSessionOrRedirect(ctx);
    if (gate instanceof Response) return gate;
    const catRows = await db.select().from(categories).orderBy(
      asc(categories.name),
    );
    const trackRows = await db.select().from(tracks).orderBy(asc(tracks.title));
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
  <div class="min-h-screen bg-base-200 dark:bg-base-800 px-4 py-8">
    <Head>
      <title>Admin — fruiz</title>
    </Head>
    <div class="max-w-2xl mx-auto flex flex-col gap-6">
      <header class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-sm opacity-80 text-base-800 dark:text-base-100">
            Signed in as
          </p>
          <p class="text-lg font-semibold text-base-900 dark:text-base-100">
            {data.session.username}
          </p>
        </div>
        <a
          href="/account"
          class="plateau rounded-full px-4 py-2 text-sm no-underline text-base-900 dark:text-base-100"
        >
          Account
        </a>
      </header>
      <section class="plateau rounded-2xl p-5 space-y-3">
        <h2 class="text-lg font-medium text-base-900 dark:text-base-100">
          Library
        </h2>
        <p class="text-sm opacity-90 text-base-800 dark:text-base-100">
          {data.categories.length} categories · {data.tracks.length} tracks
        </p>
        <div class="flex flex-wrap gap-2">
          <a
            href="/admin/categories"
            class="plateau rounded-full px-4 py-2 text-sm no-underline text-base-900 dark:text-base-100"
          >
            Manage categories
          </a>
          <a
            href="/admin/tracks"
            class="plateau rounded-full px-4 py-2 text-sm no-underline text-base-900 dark:text-base-100"
          >
            Manage tracks
          </a>
        </div>
      </section>
    </div>
  </div>
));
