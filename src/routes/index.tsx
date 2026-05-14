import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { db } from "../db/db.ts";
import {
  getAvailableQuizOptions,
  isQuizCombinationAvailable,
  parseReplayLimitFromUrl,
} from "../lib/categories.ts";
import type { DifficultyMode } from "../lib/types.ts";
import { encodeSlug, generateShortCode } from "../lib/slug.ts";
import { Button } from "../components/Button.tsx";
import { PageShell } from "../components/layout/PageShell.tsx";
import { PlateauCard } from "../components/ui/PlateauCard.tsx";
import InProgressQuizSection from "../islands/InProgressQuizSection.tsx";
import { AccountButton } from "../components/ui/AccountButton.tsx";
import { CollectionButton } from "../components/ui/CollectionButton.tsx";
import { AdminButton } from "../components/ui/AdminButton.tsx";

const difficultyGlowClass: Record<DifficultyMode, string> = {
  easy:
    "before:shadow-[0_0_16px_4px_rgb(34_197_94/0.75),0_0_36px_12px_rgb(34_197_94/0.35)]",
  mixed:
    "before:shadow-[0_0_16px_4px_rgb(234_179_8/0.75),0_0_36px_12px_rgb(234_179_8/0.35)]",
  hard:
    "before:shadow-[0_0_16px_4px_rgb(239_68_68/0.75),0_0_36px_12px_rgb(239_68_68/0.35)]",
};

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
        loggedIn: user !== null,
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
    const code = generateShortCode();
    const path = `/quiz/${category}/${encodeSlug(difficulty, code)}`;
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
          {data.loggedIn && <CollectionButton />}
          {data.showAdminLink && <AdminButton />}
          <AccountButton />
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
                    <div class="relative isolate flex flex-wrap gap-2">
                      {opt.difficulties.map((d) => (
                        <Button
                          key={d}
                          class={`relative px-6 capitalize before:content-[''] before:absolute before:inset-0 before:rounded-full before:pointer-events-none before:-z-10 ${
                            difficultyGlowClass[d]
                          }`}
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
