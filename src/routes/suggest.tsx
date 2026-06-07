import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { db } from "../db/db.ts";
import { PageShell } from "../components/layout/PageShell.tsx";
import { PlateauCard } from "../components/ui/PlateauCard.tsx";
import { HomeButton } from "../components/ui/HomeButton.tsx";
import { AccountButton } from "../components/ui/AccountButton.tsx";
import { InlineAlert } from "../components/ui/InlineAlert.tsx";
import { SuggestionStatusList } from "../components/SuggestionStatusList.tsx";
import { listAdminCategories } from "../lib/adminReads.ts";
import {
  createSuggestion,
  listSuggestionsForUser,
} from "../lib/trackSuggestions.ts";
import TrackSuggestionForm from "../islands/TrackSuggestionForm.tsx";
import { suggestionCreatedCounter } from "../lib/telemetry.ts";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_category: "Pick a category from the list before submitting.",
  missing_title: "Enter a title for the track.",
  invalid_url: "Enter a valid link starting with http:// or https://.",
};

export const handler = define.handlers({
  async GET(ctx) {
    const user = ctx.state.session.user;
    if (!user) {
      return ctx.redirect("/account/login");
    }
    const [categoryRows, mySuggestions] = await Promise.all([
      listAdminCategories(db),
      listSuggestionsForUser(db, user.id),
    ]);
    const categories = categoryRows.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
    }));
    const params = new URL(ctx.req.url).searchParams;
    return {
      data: {
        categories,
        mySuggestions,
        error: params.get("err"),
        submitted: params.get("ok") === "1",
      },
    };
  },

  async POST(ctx) {
    const user = ctx.state.session.user;
    if (!user) {
      return ctx.redirect("/account/login");
    }
    const form = await ctx.req.formData();
    const categoryKey = String(form.get("categoryKey") ?? "").trim();
    const result = await createSuggestion(db, {
      userId: user.id,
      categoryKey,
      title: String(form.get("title") ?? ""),
      youtubeUrl: String(form.get("youtubeUrl") ?? ""),
    });
    if (!result.ok) {
      return Response.redirect(
        new URL(`/suggest?err=${result.error}`, ctx.req.url).href,
        302,
      );
    }
    suggestionCreatedCounter.add(1, { category: categoryKey });
    return Response.redirect(new URL("/suggest?ok=1", ctx.req.url).href, 302);
  },
});

export default define.page<typeof handler>(({ data }) => (
  <PageShell>
    <Head>
      <title>Suggest a track — fruiz</title>
    </Head>
    <div class="max-w-xl mx-auto flex flex-col gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <h1 class="text-3xl font-semibold text-base-900 dark:text-base-100">
          Suggest a track
        </h1>
        <nav class="flex flex-wrap gap-2">
          <HomeButton />
          <AccountButton />
        </nav>
      </div>

      {data.submitted && (
        <p
          class="text-sm text-green-800 dark:text-green-200"
          role="status"
        >
          Thanks! Your suggestion was sent for review.
        </p>
      )}
      {data.error && (
        <InlineAlert variant="error" role="alert">
          {ERROR_MESSAGES[data.error] ?? "Could not submit your suggestion."}
        </InlineAlert>
      )}

      <PlateauCard padding="5">
        <p class="text-sm opacity-90 text-base-800 dark:text-base-100 mb-4">
          Pick a category, check the track isn't already there, then send us the
          title and a YouTube link. An admin will review it.
        </p>
        <TrackSuggestionForm
          categories={data.categories}
          formAction="/suggest"
        />
      </PlateauCard>

      <section class="flex flex-col gap-3">
        <h2 class="text-lg font-medium text-base-900 dark:text-base-100">
          Your suggestions
        </h2>
        <SuggestionStatusList suggestions={data.mySuggestions} />
      </section>
    </div>
  </PageShell>
));
