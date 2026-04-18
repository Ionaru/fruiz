import { Head } from "fresh/runtime";
import { AdminListHeader } from "../../../components/admin/AdminListHeader.tsx";
import { AdminPageShell } from "../../../components/admin/AdminPageShell.tsx";
import { PlateauCard } from "../../../components/ui/PlateauCard.tsx";
import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { listAdminCategories } from "../../../lib/adminReads.ts";
import { requireAdminSessionOrRedirect } from "../../../lib/adminSession.ts";
import { AdminButton } from "../../../components/ui/AdminButton.tsx";
import { NewCategoryButton } from "../../../components/admin/NewCategoryButton.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const gate = requireAdminSessionOrRedirect(ctx);
    if (gate instanceof Response) return gate;
    const rows = await listAdminCategories(db);
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
          <AdminButton />
          <NewCategoryButton />
        </>
      }
    />
    <ul class="flex flex-col gap-2">
      {data.categories.map((c) => (
        <li key={c.id}>
          <PlateauCard
            padding="none"
            class="rounded-xl px-4 py-3"
          >
            <a
              href={`/admin/categories/${c.id}`}
              class="flex justify-between gap-2 no-underline"
            >
              <span class="font-medium">{c.name}</span>
              <span class="text-sm opacity-80">{c.slug}</span>
            </a>
          </PlateauCard>
        </li>
      ))}
    </ul>
    {data.categories.length === 0 && (
      <p class="text-sm opacity-80">No categories yet.</p>
    )}
  </AdminPageShell>
));
