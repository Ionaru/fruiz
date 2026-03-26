import { Head } from "fresh/runtime";
import { asc } from "drizzle-orm";
import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { tracks } from "../../../db/schema.ts";
import { requireAdminSessionOrRedirect } from "../../../lib/adminSession.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const gate = await requireAdminSessionOrRedirect(ctx.req);
    if (gate instanceof Response) return gate;
    const rows = await db.select().from(tracks).orderBy(asc(tracks.title));
    return { data: { session: gate.session, tracks: rows } };
  },
});

export default define.page<typeof handler>(({ data }) => (
  <div class="min-h-screen bg-base-200 dark:bg-base-800 px-4 py-8">
    <Head>
      <title>Tracks — admin</title>
    </Head>
    <div class="max-w-2xl mx-auto flex flex-col gap-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-2xl font-semibold">Tracks</h1>
        <div class="flex flex-wrap gap-2">
          <a
            href="/admin"
            class="plateau rounded-full px-4 py-2 text-sm no-underline text-inherit"
          >
            Dashboard
          </a>
          <a
            href="/admin/tracks/new"
            class="plateau rounded-full px-4 py-2 text-sm no-underline text-inherit"
          >
            New track
          </a>
        </div>
      </div>
      <ul class="flex flex-col gap-2">
        {data.tracks.map((t) => (
          <li key={t.id}>
            <a
              href={`/admin/tracks/${t.id}`}
              class="plateau rounded-xl px-4 py-3 flex flex-wrap justify-between gap-2 no-underline text-inherit"
            >
              <span class="font-medium">{t.title}</span>
              <span class="text-sm opacity-80 capitalize">{t.difficulty}</span>
            </a>
          </li>
        ))}
      </ul>
      {data.tracks.length === 0 && (
        <p class="text-sm opacity-80">No tracks yet.</p>
      )}
    </div>
  </div>
));
