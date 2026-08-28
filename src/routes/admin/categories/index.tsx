import { Head } from "fresh/runtime";
import { AdminCategoryListItem } from "../../../components/admin/AdminCategoryListItem.tsx";
import { AdminListHeader } from "../../../components/admin/AdminListHeader.tsx";
import { AdminPageShell } from "../../../components/admin/AdminPageShell.tsx";
import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { listAdminCategories } from "../../../lib/adminReads.ts";
import { requireAdminSessionOrRedirect } from "../../../lib/adminSession.ts";
import { NewCategoryButton } from "../../../components/admin/NewCategoryButton.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const gate = requireAdminSessionOrRedirect(ctx);
    if (gate instanceof Response) return gate;
    const rows = await listAdminCategories(db);
    return { data: { session: gate.session, categories: rows } };
  },
});

export default define.page<typeof handler>(({ data, state, url }) => (
  <AdminPageShell user={state.session.user} currentPath={url.pathname}>
    <Head>
      <title>Categories — admin</title>
    </Head>
    <AdminListHeader title="Categories" actions={<NewCategoryButton />} />
    <ul class="flex flex-col gap-2">
      {data.categories.map((category) => (
        <AdminCategoryListItem
          key={category.id}
          id={category.id}
          name={category.name}
          slug={category.slug}
        />
      ))}
    </ul>
    {data.categories.length === 0 && (
      <p class="text-sm opacity-80">No categories yet.</p>
    )}
  </AdminPageShell>
));
