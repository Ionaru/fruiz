import QuizController from "../../islands/QuizController.tsx";
import type { CategoryRow } from "../../lib/categories.ts";
import type { QuizIdentity, QuizTrackPayload } from "../../lib/types.ts";

export interface QuizPlayerProps {
  category: CategoryRow;
  identity: QuizIdentity;
  replayLimit: number | null;
  tracks: QuizTrackPayload[];
  titleSuggestions: string[];
  quizPath: string;
  /** Set by the quiz route for `<Head>` / OG tags; not passed to islands. */
  shareMeta?: {
    title: string;
    description: string;
    url: string;
  };
}

export function QuizPlayer(props: Readonly<QuizPlayerProps>) {
  return (
    <div class="min-h-screen bg-base-200 dark:bg-base-800 text-base-900 dark:text-base-100 px-4 py-6">
      <div class="max-w-lg mx-auto flex flex-col gap-6">
        <header class="plateau rounded-2xl p-5">
          <p class="text-sm opacity-80">Category</p>
          <h1 class="text-2xl font-semibold">{props.category.name}</h1>
        </header>
        <QuizController
          identity={props.identity}
          initialReplayLimit={props.replayLimit}
          tracks={props.tracks}
          titleSuggestions={props.titleSuggestions}
          quizPath={props.quizPath}
        />
      </div>
    </div>
  );
}
