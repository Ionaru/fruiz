import { Head } from "fresh/runtime";
import { eq, sql } from "drizzle-orm";
import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { categories, trackCategories } from "../../../db/schema.ts";
import { requireAdminSessionOrRedirect } from "../../../lib/adminSession.ts";
import { CategoryForm } from "../../../components/admin/CategoryForm.tsx";
import { Button } from "../../../components/Button.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const gate = await requireAdminSessionOrRedirect(ctx.req);
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
    const gate = await requireAdminSessionOrRedirect(ctx.req);
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
  <div class="min-h-screen bg-base-200 dark:bg-base-800 px-4 py-8">
    <Head>
      <title>{data.category.name} — category</title>
    </Head>
    <div class="max-w-xl mx-auto flex flex-col gap-6">
      <a
        href="/admin/categories"
        class="plateau rounded-full px-4 py-2 text-sm no-underline text-inherit w-fit"
      >
        Back
      </a>
      <h1 class="text-2xl font-semibold">Edit category</h1>
      {data.queryError === "slug" && (
        <p class="text-sm text-red-800 dark:text-red-200" role="alert">
          That slug is already taken.
        </p>
      )}
      {data.queryError === "assigned" && (
        <p class="text-sm text-red-800 dark:text-red-200" role="alert">
          Remove track assignments before deleting this category.
        </p>
      )}
      {data.queryError === "confirm" && (
        <p class="text-sm text-red-800 dark:text-red-200" role="alert">
          Type DELETE to confirm removal.
        </p>
      )}
      <p class="text-sm opacity-80">
        {data.assignmentCount} track assignment(s)
      </p>
      <CategoryForm
        action={`/admin/categories/${data.category.id}`}
        defaultName={data.category.name}
        defaultSlug={data.category.slug}
        submitLabel="Save changes"
      />
      <form
        method="post"
        action={`/admin/categories/${data.category.id}`}
        class="plateau rounded-2xl p-5 space-y-3 border border-red-900/20"
      >
        <input type="hidden" name="intent" value="delete" />
        <p class="text-sm font-medium text-red-900 dark:text-red-200">
          Danger zone
        </p>
        <label class="block text-sm" for="confirm-del">
          Type <code>DELETE</code> to confirm
        </label>
        <input
          id="confirm-del"
          name="confirm"
          class="plateau rounded-xl px-3 py-2 w-full border-0 bg-transparent"
          autocomplete="off"
        />
        <Button
          type="submit"
          variant="danger"
          class="w-full"
          disabled={data.assignmentCount > 0}
        >
          Delete category
        </Button>
      </form>
    </div>
  </div>
));
