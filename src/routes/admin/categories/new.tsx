import { Head } from "fresh/runtime";
import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { categories } from "../../../db/schema.ts";
import { requireAdminSessionOrRedirect } from "../../../lib/adminSession.ts";
import { formatSlugFromName } from "../../../lib/formatSlug.ts";
import { AdminBackLink } from "../../../components/admin/AdminBackLink.tsx";
import { AdminPageShell } from "../../../components/admin/AdminPageShell.tsx";
import { CategoryForm } from "../../../components/admin/CategoryForm.tsx";
import { InlineAlert } from "../../../components/ui/InlineAlert.tsx";

export const handler = define.handlers({
  GET(ctx) {
    const gate = requireAdminSessionOrRedirect(ctx);
    if (gate instanceof Response) return gate;
    const slugError = new URL(ctx.req.url).searchParams.get("err") === "slug";
    return { data: { session: gate.session, slugError } };
  },
  async POST(ctx) {
    const gate = requireAdminSessionOrRedirect(ctx);
    if (gate instanceof Response) return gate;
    const form = await ctx.req.formData();
    const name = String(form.get("name") ?? "").trim();
    let slug = String(form.get("slug") ?? "").trim();
    if (!name) {
      return Response.redirect(
        new URL("/admin/categories/new", ctx.req.url).href,
        302,
      );
    }
    if (!slug) slug = formatSlugFromName(name);
    try {
      await db.insert(categories).values({ name, slug });
    } catch {
      return Response.redirect(
        new URL("/admin/categories/new?err=slug", ctx.req.url).href,
        302,
      );
    }
    return Response.redirect(
      new URL("/admin/categories", ctx.req.url).href,
      302,
    );
  },
});

export default define.page<typeof handler>(({ data }) => (
  <AdminPageShell maxWidth="xl">
    <Head>
      <title>New category — admin</title>
    </Head>
    <div class="flex flex-wrap gap-2">
      <AdminBackLink href="/admin/categories" />
    </div>
    <h1 class="text-2xl font-semibold text-base-900 dark:text-base-100">
      New category
    </h1>
    {data.slugError && (
      <InlineAlert variant="error" role="alert">
        That slug is already taken. Choose another.
      </InlineAlert>
    )}
    <CategoryForm
      action="/admin/categories/new"
      submitLabel="Create category"
    />
  </AdminPageShell>
));
