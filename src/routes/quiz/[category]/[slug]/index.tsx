import { Head } from "fresh/runtime";
import { define } from "../../../../utils.ts";
import { db } from "../../../../db/db.ts";
import {
  getCategoryBySlug,
  getDistinctTitlesForCategory,
  parseReplayLimitFromUrl,
} from "../../../../lib/categories.ts";
import { decodeSlug } from "../../../../lib/slug.ts";
import { getOrCreateQuizInstance } from "../../../../lib/quizInstances.ts";
import {
  buildPageTitle,
  buildQuizDescription,
  buildQuizTitle,
  resolveCanonicalOrigin,
} from "../../../../lib/siteMeta.ts";
import { QuizPlayer } from "../../../../components/quiz/QuizPlayer.tsx";
import QuizController from "../../../../islands/QuizController.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const categorySlug = ctx.params.category;
    const slugParam = ctx.params.slug;
    if (!categorySlug || !slugParam) {
      return Response.redirect(new URL("/", ctx.req.url).href, 302);
    }
    const decoded = decodeSlug(slugParam);
    if (!decoded) {
      return Response.redirect(new URL("/", ctx.req.url).href, 302);
    }

    const category = await getCategoryBySlug(db, categorySlug);
    if (!category) {
      return Response.redirect(new URL("/", ctx.req.url).href, 302);
    }

    const { difficulty, code } = decoded;
    const quizInstance = await getOrCreateQuizInstance(db, {
      categorySlug,
      categoryId: category.id,
      difficulty,
      code,
    });
    if (!quizInstance || quizInstance.tracks.length < 20) {
      return Response.redirect(new URL("/", ctx.req.url).href, 302);
    }

    const url = new URL(ctx.req.url);
    const replayLimit = parseReplayLimitFromUrl(url.searchParams);

    const titleSuggestions = await getDistinctTitlesForCategory(
      db,
      category.id,
      difficulty,
    );
    const tracksPayload = quizInstance.tracks;
    const quizPath = `/quiz/${categorySlug}/${slugParam}`;
    // Not `url.origin`: behind the reverse proxy that is the internal hop, and
    // an unfurler has to be able to fetch what `og:url` points at.
    const canonicalOrigin = resolveCanonicalOrigin(url);

    return {
      data: {
        category,
        difficulty,
        identity: { categorySlug, difficulty, code },
        initialReplayLimit: replayLimit,
        tracks: tracksPayload,
        titleSuggestions,
        quizPath,
        loggedIn: ctx.state.session.user !== null,
        shareMeta: {
          title: buildQuizTitle(category.name),
          description: buildQuizDescription(category.name, difficulty),
          url: `${canonicalOrigin}${quizPath}`,
        },
      },
    };
  },
});

export default define.page<typeof handler>(({ data, state, url }) => (
  <>
    <Head>
      <title>{buildPageTitle(data.shareMeta.title)}</title>
      <meta name="description" content={data.shareMeta.description} />
      <meta property="og:title" content={data.shareMeta.title} />
      <meta property="og:description" content={data.shareMeta.description} />
      <meta property="og:url" content={data.shareMeta.url} />
      <meta name="twitter:title" content={data.shareMeta.title} />
      <meta name="twitter:description" content={data.shareMeta.description} />
    </Head>
    <QuizPlayer
      category={data.category}
      difficulty={data.difficulty}
      user={state.session.user}
      currentPath={url.pathname}
    >
      <QuizController
        identity={data.identity}
        initialReplayLimit={data.initialReplayLimit ?? 0}
        tracks={data.tracks}
        titleSuggestions={data.titleSuggestions}
        quizPath={data.quizPath}
        loggedIn={data.loggedIn}
      />
    </QuizPlayer>
  </>
));
