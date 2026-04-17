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
import { QuizPlayer } from "../../../../components/quiz/QuizPlayer.tsx";
import QuizPlayerClient from "../../../../islands/QuizPlayerClient.tsx";

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
    );
    const tracksPayload = quizInstance.tracks;
    const quizPath = `/quiz/${categorySlug}/${slugParam}`;
    const origin = new URL(ctx.req.url).origin;
    const shareDescription = `20-track ${category.name} quiz on fruiz`;

    return {
      data: {
        category,
        difficulty,
        identity: { categorySlug, difficulty, code },
        replayLimit,
        tracks: tracksPayload,
        titleSuggestions,
        quizPath,
        loggedIn: ctx.state.session.user !== null,
        shareMeta: {
          title: `${category.name} quiz`,
          description: shareDescription,
          url: `${origin}${quizPath}`,
        },
      },
    };
  },
});

export default define.page<typeof handler>(({ data }) => (
  <>
    <Head>
      <title>{data.category.name} quiz — fruiz</title>
      <meta name="description" content={data.shareMeta.description} />
      <meta property="og:title" content={data.shareMeta.title} />
      <meta property="og:description" content={data.shareMeta.description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={data.shareMeta.url} />
    </Head>
    <QuizPlayer category={data.category} difficulty={data.difficulty}>
      <QuizPlayerClient
        identity={data.identity}
        replayLimit={data.replayLimit ?? 0}
        tracks={data.tracks}
        titleSuggestions={data.titleSuggestions}
        quizPath={data.quizPath}
        loggedIn={data.loggedIn}
      />
    </QuizPlayer>
  </>
));
