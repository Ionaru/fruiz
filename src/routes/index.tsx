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
import { StartNewQuizSection } from "../components/quiz/StartNewQuizSection.tsx";
import InProgressQuizSection from "../islands/InProgressQuizSection.tsx";
import { AccountButton } from "../components/ui/AccountButton.tsx";
import { CollectionButton } from "../components/ui/CollectionButton.tsx";
import { AdminButton } from "../components/ui/AdminButton.tsx";

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

export default define.page<typeof handler>(({ data }) => (
  <PageShell>
    <Head>
      <title>fruiz - musical quiz</title>
    </Head>
    <div class="max-w-xl mx-auto flex flex-col gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-semibold text-base-900 dark:text-base-100">
            Musical quiz
          </h1>
          <p class="mt-1 text-sm text-base-900/70 dark:text-base-100/70">
            Do you know where the music is from?
          </p>
        </div>
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
      <StartNewQuizSection options={data.options} />
    </div>
  </PageShell>
));
