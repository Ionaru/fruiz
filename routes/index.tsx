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
  <div class="min-h-screen bg-base-200 dark:bg-base-800 px-4 py-8">
    <Head>
      <title>fruiz - musical quiz</title>
    </Head>
    <div class="max-w-xl mx-auto flex flex-col gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <h1 class="text-3xl font-semibold text-base-900 dark:text-base-100">
          Musical quiz
        </h1>
        <nav
          class="flex flex-wrap gap-2 text-sm"
          aria-label="Account and administration"
        >
          <a
            href="/account"
            class="plateau rounded-full px-4 py-2 no-underline text-base-900 dark:text-base-100"
          >
            Account
          </a>
          {data.showAdminLink && (
            <a
              href="/admin"
              class="plateau rounded-full px-4 py-2 no-underline text-base-900 dark:text-base-100"
            >
              Admin
            </a>
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
      {data.options.length === 0
        ? (
          <p class="plateau rounded-2xl p-6 text-base-800 dark:text-base-100">
            No quizzes available yet. Seed categories and at least 20 tracks per
            difficulty mode.
          </p>
        )
        : (
          <div class="flex flex-col gap-6">
            {data.options.map((opt) => (
              <form
                key={opt.category.slug}
                method="post"
                class="plateau rounded-2xl p-5 space-y-4"
              >
                <input
                  type="hidden"
                  name="category"
                  value={opt.category.slug}
                />
                <h2 class="text-xl font-medium text-base-900 dark:text-base-100">
                  {opt.category.name}
                </h2>
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
            ))}
          </div>
        )}
    </div>
  </div>
));
