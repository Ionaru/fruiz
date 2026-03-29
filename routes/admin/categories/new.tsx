import { Head } from "fresh/runtime";
import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { categories } from "../../../db/schema.ts";
import { requireAdminSessionOrRedirect } from "../../../lib/adminSession.ts";
import { formatSlugFromName } from "../../../lib/formatSlug.ts";
import { CategoryForm } from "../../../components/admin/CategoryForm.tsx";

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
  <div class="min-h-screen bg-base-200 dark:bg-base-800 px-4 py-8">
    <Head>
      <title>New category — admin</title>
    </Head>
    <div class="max-w-xl mx-auto flex flex-col gap-6">
      <div class="flex flex-wrap gap-2">
        <a
          href="/admin/categories"
          class="plateau rounded-full px-4 py-2 text-sm no-underline text-inherit"
        >
          Back
        </a>
      </div>
      <h1 class="text-2xl font-semibold">New category</h1>
      {data.slugError && (
        <p class="text-sm text-red-800 dark:text-red-200" role="alert">
          That slug is already taken. Choose another.
        </p>
      )}
      <CategoryForm
        action="/admin/categories/new"
        submitLabel="Create category"
      />
    </div>
  </div>
));
