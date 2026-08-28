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
import { PageShell } from "../components/layout/PageShell.tsx";
import { SiteHeader } from "../components/layout/SiteHeader.tsx";
import { StartNewQuizSection } from "../components/quiz/StartNewQuizSection.tsx";
import InProgressQuizSection from "../islands/InProgressQuizSection.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const options = await getAvailableQuizOptions(db);
    const homeLimitQuery = parseReplayLimitFromUrl(
      new URL(ctx.req.url).searchParams,
    );
    return {
      data: {
        options,
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

export default define.page<typeof handler>(({ data, state, url }) => (
  <PageShell>
    <Head>
      <title>fruiz - musical quiz</title>
    </Head>
    <div class="max-w-xl mx-auto flex flex-col gap-6">
      <SiteHeader user={state.session.user} currentPath={url.pathname} />
      {data.homeLimitQuery !== null && (
        <p class="plateau rounded-xl px-4 py-3 text-sm text-base-800 dark:text-base-100">
          Replay limits are chosen on the quiz page. The{" "}
          <code class="opacity-90">limit</code>{" "}
          query on the home URL is ignored until you open a quiz.
        </p>
      )}
      <InProgressQuizSection />
      <StartNewQuizSection options={data.options} />
    </div>
  </PageShell>
));
