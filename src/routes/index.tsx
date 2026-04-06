import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { db } from "../db/db.ts";
import {
  getAvailableQuizOptions,
  isQuizCombinationAvailable,
  parseReplayLimitFromUrl,
} from "../lib/categories.ts";
import type { DifficultyMode } from "../lib/types.ts";
import { encodeSlug, generateShortSeed } from "../lib/slug.ts";
import { Button } from "../components/Button.tsx";
import { PageShell } from "../components/layout/PageShell.tsx";
import { PillLink } from "../components/ui/PillLink.tsx";
import { PlateauCard } from "../components/ui/PlateauCard.tsx";
import InProgressQuizSection from "../islands/InProgressQuizSection.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const options = await getAvailableQuizOptions(db);
    const homeLimitQuery = parseReplayLimitFromUrl(
      new URL(ctx.req.url).searchParams,
    );
    const user = ctx.state.session.user;
    return {
      data: {
        options,
        homeLimitQuery,
        showAdminLink: user?.admin === true,
      },
    };
  },
  async POST(ctx) {
    const form = await ctx.req.formData();
    const category = String(form.get("category") ?? "");
    const difficulty = String(form.get("difficulty") ?? "") as DifficultyMode;
    if (!category || !["easy", "hard", "mixed"].includes(difficulty)) {
      return Response.redirect(new URL("/", ctx.req.url).href, 302);
    }
    if (!await isQuizCombinationAvailable(db, category, difficulty)) {
      return Response.redirect(new URL("/", ctx.req.url).href, 302);
    }
    const seed = generateShortSeed();
    const path = `/quiz/${category}/${encodeSlug(difficulty, seed)}`;
    return Response.redirect(new URL(path, ctx.req.url).href, 302);
  },
});

export default define.page<typeof handler>(({ data }) => (
  <PageShell>
    <Head>
      <title>fruiz - musical quiz</title>
    </Head>
    <div class="max-w-xl mx-auto flex flex-col gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <h1 class="text-3xl font-semibold text-base-900 dark:text-base-100">
          Musical quiz
        </h1>
        <nav class="flex flex-wrap gap-2">
          <PillLink href="/account" class="text-base-900 dark:text-base-100">
            Account
          </PillLink>
          {data.showAdminLink && (
            <PillLink href="/admin" class="text-base-900 dark:text-base-100">
              Admin
            </PillLink>
          )}
        </nav>
      </div>
      {data.homeLimitQuery !== null && (
        <p class="plateau rounded-xl px-4 py-3 text-sm text-base-800 dark:text-base-100">
          Replay limits are chosen on the quiz page. The{" "}
          <code class="opacity-90">limit</code>{" "}
          query on the home URL is ignored until you open a quiz.
        </p>
      )}
      <InProgressQuizSection />
      <section class="space-y-3">
        <h2 class="text-lg font-medium text-base-900 dark:text-base-100">
          Start new quiz
        </h2>
        {data.options.length === 0
          ? (
            <PlateauCard class="text-base-800 dark:text-base-100">
              No quizzes available yet. Seed categories and at least 20 tracks
              per difficulty mode.
            </PlateauCard>
          )
          : (
            <div class="flex flex-col gap-6">
              {data.options.map((opt) => (
                <PlateauCard key={opt.category.slug} padding="5">
                  <form method="post" class="space-y-4">
                    <input
                      type="hidden"
                      name="category"
                      value={opt.category.slug}
                    />
                    <h3 class="text-xl font-medium text-base-900 dark:text-base-100">
                      {opt.category.name}
                    </h3>
                    <div class="flex flex-wrap gap-2">
                      {opt.difficulties.map((d) => (
                        <Button
                          key={d}
                          variant="info"
                          class="px-6 capitalize"
                          name="difficulty"
                          value={d}
                          type="submit"
                        >
                          {d}
                        </Button>
                      ))}
                    </div>
                  </form>
                </PlateauCard>
              ))}
            </div>
          )}
      </section>
    </div>
  </PageShell>
));
