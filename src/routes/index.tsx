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
import { getCollectedCountsBySlug } from "../lib/collections.ts";
import { PageShell } from "../components/layout/PageShell.tsx";
import { SignInPromptStrip } from "../components/layout/SignInPromptStrip.tsx";
import { SiteHeader } from "../components/layout/SiteHeader.tsx";
import { StartNewQuizSection } from "../components/quiz/StartNewQuizSection.tsx";
import InProgressQuizSection from "../islands/InProgressQuizSection.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const user = ctx.state.session.user;
    const [options, collectedBySlug] = await Promise.all([
      getAvailableQuizOptions(db),
      user === null ? null : getCollectedCountsBySlug(db, user.id),
    ]);
    const homeLimitQuery = parseReplayLimitFromUrl(
      new URL(ctx.req.url).searchParams,
    );
    return {
      data: {
        options,
        collectedBySlug,
        homeLimitQuery,
      },
    };
  },
  async POST(ctx) {
    const form = await ctx.req.formData();
    const category = String(form.get("category") ?? "");
    const difficulty = String(form.get("difficulty") ?? "") as DifficultyMode;
    if (!category || !["easy", "hard"].includes(difficulty)) {
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

/**
 * Resume comes before the categories in the source because it is the first
 * thing a returning player wants on a phone. From `lg` the row reverses so the
 * categories lead and the saved quizzes settle into a side column.
 */
export default define.page<typeof handler>(({ data, state, url }) => {
  const user = state.session.user;
  const categoryNames = Object.fromEntries(
    data.options.map(({ category }) => [category.slug, category.name]),
  );
  return (
    <PageShell>
      <Head>
        <title>fruiz - musical quiz</title>
      </Head>
      <div class="mx-auto flex w-full max-w-xl flex-col gap-5 lg:max-w-[832px] lg:gap-6">
        <SiteHeader user={user} currentPath={url.pathname} />
        {data.homeLimitQuery !== null && (
          <p class="plateau rounded-xl px-4 py-3 text-sm text-base-800 dark:text-base-100">
            Replay limits are chosen on the quiz page. The{" "}
            <code class="opacity-90">limit</code>{" "}
            query on the home URL is ignored until you open a quiz.
          </p>
        )}
        {user === null && <SignInPromptStrip />}
        <div class="flex flex-col gap-5 lg:flex-row-reverse lg:items-start lg:gap-6">
          <InProgressQuizSection
            categoryNames={categoryNames}
            class="lg:w-[260px] lg:shrink-0"
          />
          <StartNewQuizSection
            options={data.options}
            collectedBySlug={data.collectedBySlug}
            class="lg:min-w-0 lg:flex-1"
          />
        </div>
      </div>
    </PageShell>
  );
});
