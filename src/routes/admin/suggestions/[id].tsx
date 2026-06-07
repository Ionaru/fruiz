import { Head } from "fresh/runtime";
import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { requireAdminSessionOrRedirect } from "../../../lib/adminSession.ts";
import {
  getSuggestionById,
  reviewSuggestion,
} from "../../../lib/trackSuggestions.ts";
import { AdminBackLink } from "../../../components/admin/AdminBackLink.tsx";
import { AdminPageShell } from "../../../components/admin/AdminPageShell.tsx";
import { SuggestionReviewForm } from "../../../components/admin/SuggestionReviewForm.tsx";
import { SuggestionStatusBadge } from "../../../components/SuggestionStatusBadge.tsx";
import { InlineAlert } from "../../../components/ui/InlineAlert.tsx";
import { PlateauCard } from "../../../components/ui/PlateauCard.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const gate = requireAdminSessionOrRedirect(ctx);
    if (gate instanceof Response) return gate;
    const id = ctx.params.id;
    if (!id) {
      return Response.redirect(
        new URL("/admin/suggestions", ctx.req.url).href,
        302,
      );
    }
    const suggestion = await getSuggestionById(db, id);
    if (!suggestion) {
      return Response.redirect(
        new URL("/admin/suggestions", ctx.req.url).href,
        302,
      );
    }
    const queryError = new URL(ctx.req.url).searchParams.get("err");
    return { data: { session: gate.session, suggestion, queryError } };
  },

  async POST(ctx) {
    const gate = requireAdminSessionOrRedirect(ctx);
    if (gate instanceof Response) return gate;
    const id = ctx.params.id;
    if (!id) {
      return Response.redirect(
        new URL("/admin/suggestions", ctx.req.url).href,
        302,
      );
    }
    const form = await ctx.req.formData();
    const intent = String(form.get("intent") ?? "");
    const decision = intent === "approve"
      ? "approved"
      : intent === "deny"
      ? "denied"
      : null;
    if (decision === null) {
      return Response.redirect(
        new URL(`/admin/suggestions/${id}?err=intent`, ctx.req.url).href,
        302,
      );
    }
    const note = String(form.get("note") ?? "");
    const result = await reviewSuggestion(db, {
      id,
      decision,
      adminNote: note,
      reviewedByUserId: gate.session.userId,
    });
    if (!result.ok) {
      return Response.redirect(
        new URL("/admin/suggestions", ctx.req.url).href,
        302,
      );
    }
    return Response.redirect(
      new URL("/admin/suggestions", ctx.req.url).href,
      302,
    );
  },
});

export default define.page<typeof handler>(({ data }) => {
  const { suggestion } = data;
  return (
    <AdminPageShell>
      <Head>
        <title>{suggestion.title} — suggestion</title>
      </Head>
      <AdminBackLink href="/admin/suggestions" />
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-2xl font-semibold text-base-900 dark:text-base-100">
          Review suggestion
        </h1>
        <SuggestionStatusBadge status={suggestion.status} />
      </div>
      {data.queryError === "intent" && (
        <InlineAlert variant="error" role="alert">
          Choose Approve or Deny.
        </InlineAlert>
      )}
      <PlateauCard padding="5" class="space-y-2">
        <h2 class="text-lg font-medium break-words">{suggestion.title}</h2>
        <p class="text-sm opacity-80">
          Category: <span class="font-medium">{suggestion.category.name}</span>
        </p>
        <p class="text-sm opacity-80">
          Suggested by{" "}
          <span class="font-medium">{suggestion.user.username}</span>
        </p>
        <p class="text-sm opacity-80">
          Link:{" "}
          <a
            href={suggestion.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="underline text-inherit break-all"
          >
            {suggestion.youtubeUrl}
          </a>
        </p>
        {suggestion.adminNote && (
          <p class="text-sm">
            <span class="font-medium">Current note:</span>{" "}
            {suggestion.adminNote}
          </p>
        )}
      </PlateauCard>
      <SuggestionReviewForm
        action={`/admin/suggestions/${suggestion.id}`}
        defaultNote={suggestion.adminNote ?? ""}
      />
    </AdminPageShell>
  );
});
