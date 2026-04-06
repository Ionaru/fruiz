import { Head } from "fresh/runtime";
import { asc } from "drizzle-orm";
import { AdminListHeader } from "../../../components/admin/AdminListHeader.tsx";
import { AdminPageShell } from "../../../components/admin/AdminPageShell.tsx";
import { PlateauCard } from "../../../components/ui/PlateauCard.tsx";
import { PillLink } from "../../../components/ui/PillLink.tsx";
import { AudioPlayer } from "../../../islands/AudioPlayer.tsx";
import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { tracks } from "../../../db/schema.ts";
import { requireAdminSessionOrRedirect } from "../../../lib/adminSession.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const gate = requireAdminSessionOrRedirect(ctx);
    if (gate instanceof Response) return gate;
    const rows = await db.select().from(tracks).orderBy(asc(tracks.title));
    return { data: { session: gate.session, tracks: rows } };
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
      {data.tracks.map((t) => (
        <li key={t.id}>
          <PlateauCard
            padding="none"
            class="rounded-xl px-4 py-3 flex flex-wrap items-center gap-3"
          >
            <div class="shrink-0">
              <AudioPlayer audioId={t.id} compact />
            </div>
            <a
              href={`/admin/tracks/${t.id}`}
              class="flex flex-wrap flex-1 min-w-0 justify-between gap-2 no-underline"
            >
              <span class="font-medium">{t.title}</span>
              <span class="text-sm opacity-80 capitalize">{t.difficulty}</span>
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
