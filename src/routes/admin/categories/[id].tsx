import { Head } from "fresh/runtime";
import { eq, sql } from "drizzle-orm";
import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { categories, trackCategories } from "../../../db/schema.ts";
import { requireAdminSessionOrRedirect } from "../../../lib/adminSession.ts";
import { AdminBackLink } from "../../../components/admin/AdminBackLink.tsx";
import { AdminPageShell } from "../../../components/admin/AdminPageShell.tsx";
import { CategoryForm } from "../../../components/admin/CategoryForm.tsx";
import { DangerZoneDeleteForm } from "../../../components/admin/DangerZoneDeleteForm.tsx";
import { InlineAlert } from "../../../components/ui/InlineAlert.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const gate = requireAdminSessionOrRedirect(ctx);
    if (gate instanceof Response) return gate;
    const id = ctx.params.id;
    const [row] = await db.select().from(categories).where(
      eq(categories.id, id),
    ).limit(1);
    if (!row) {
      return Response.redirect(
        new URL("/admin/categories", ctx.req.url).href,
        302,
      );
    }
    const [{ c }] = await db
      .select({ c: sql<number>`count(*)` })
      .from(trackCategories)
      .where(eq(trackCategories.categoryId, id));
    const assignmentCount = Number(c ?? 0);
    const queryError = new URL(ctx.req.url).searchParams.get("err");
    return {
      data: {
        session: gate.session,
        category: row,
        assignmentCount,
        queryError,
      },
    };
  },

  async POST(ctx) {
    const gate = requireAdminSessionOrRedirect(ctx);
    if (gate instanceof Response) return gate;
    const id = ctx.params.id;
    const form = await ctx.req.formData();
    const intent = String(form.get("intent") ?? "");

    if (intent === "delete") {
      const confirm = String(form.get("confirm") ?? "");
      if (confirm !== "DELETE") {
        return Response.redirect(
          new URL(`/admin/categories/${id}?err=confirm`, ctx.req.url).href,
          302,
        );
      }
      const [{ c }] = await db
        .select({ c: sql<number>`count(*)` })
        .from(trackCategories)
        .where(eq(trackCategories.categoryId, id));
      if (Number(c ?? 0) > 0) {
        return Response.redirect(
          new URL(`/admin/categories/${id}?err=assigned`, ctx.req.url).href,
          302,
        );
      }
      await db.delete(categories).where(eq(categories.id, id));
      return Response.redirect(
        new URL("/admin/categories", ctx.req.url).href,
        302,
      );
    }

    const name = String(form.get("name") ?? "").trim();
    const slug = String(form.get("slug") ?? "").trim();
    if (!name || !slug) {
      return Response.redirect(
        new URL(`/admin/categories/${id}`, ctx.req.url).href,
        302,
      );
    }
    try {
      await db.update(categories).set({ name, slug }).where(
        eq(categories.id, id),
      );
    } catch {
      return Response.redirect(
        new URL(`/admin/categories/${id}?err=slug`, ctx.req.url).href,
        302,
      );
    }
    return Response.redirect(
      new URL(`/admin/categories/${id}`, ctx.req.url).href,
      302,
    );
  },
});

export default define.page<typeof handler>(({ data }) => (
  <AdminPageShell>
    <Head>
      <title>{data.category.name} — category</title>
    </Head>
    <AdminBackLink href="/admin/categories" />
    <h1 class="text-2xl font-semibold text-base-900 dark:text-base-100">
      Edit category
    </h1>
    {data.queryError === "slug" && (
      <InlineAlert variant="error" role="alert">
        That slug is already taken.
      </InlineAlert>
    )}
    {data.queryError === "assigned" && (
      <InlineAlert variant="error" role="alert">
        Remove track assignments before deleting this category.
      </InlineAlert>
    )}
    {data.queryError === "confirm" && (
      <InlineAlert variant="error" role="alert">
        Type DELETE to confirm removal.
      </InlineAlert>
    )}
    <p class="text-sm opacity-80 text-base-800 dark:text-base-100">
      {data.assignmentCount} track assignment(s)
    </p>
    <CategoryForm
      action={`/admin/categories/${data.category.id}`}
      defaultName={data.category.name}
      defaultSlug={data.category.slug}
      submitLabel="Save changes"
    />
    <DangerZoneDeleteForm
      action={`/admin/categories/${data.category.id}`}
      confirmInputId="confirm-del"
      submitLabel="Delete category"
      disabled={data.assignmentCount > 0}
    />
  </AdminPageShell>
));
