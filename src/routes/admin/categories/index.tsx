import { Head } from "fresh/runtime";
import { asc } from "drizzle-orm";
import { AdminListHeader } from "../../../components/admin/AdminListHeader.tsx";
import { AdminPageShell } from "../../../components/admin/AdminPageShell.tsx";
import { PillLink } from "../../../components/ui/PillLink.tsx";
import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { categories } from "../../../db/schema.ts";
import { requireAdminSessionOrRedirect } from "../../../lib/adminSession.ts";
export const handler = define.handlers({
  async GET(ctx) {
    const gate = requireAdminSessionOrRedirect(ctx);
    if (gate instanceof Response) return gate;
    const rows = await db.select().from(categories).orderBy(
      asc(categories.name),
    );
    return { data: { session: gate.session, categories: rows } };
  },
});

export default define.page<typeof handler>(({ data }) => (
  <AdminPageShell>
    <Head>
      <title>Categories — admin</title>
    </Head>
    <AdminListHeader
      title="Categories"
      actions={
        <>
          <PillLink href="/admin">
            Dashboard
          </PillLink>
          <PillLink href="/admin/categories/new">
            New category
          </PillLink>
        </>
      }
    />
    <ul class="flex flex-col gap-2">
      {data.categories.map((c) => (
        <li key={c.id}>
          <a
            href={`/admin/categories/${c.id}`}
            class="plateau rounded-xl px-4 py-3 flex justify-between gap-2 no-underline"
          >
            <span class="font-medium">{c.name}</span>
            <span class="text-sm opacity-80">{c.slug}</span>
          </a>
        </li>
      ))}
    </ul>
    {data.categories.length === 0 && (
      <p class="text-sm opacity-80">No categories yet.</p>
    )}
  </AdminPageShell>
));
