import { Button } from "../Button.tsx";
import { QuizResultRow } from "./QuizResultRow.tsx";
import { scoreFromProgress } from "../../lib/quizProgress.ts";
import type { QuizProgress, QuizTrackPayload } from "../../lib/types.ts";

export interface QuizResultsProps {
  tracks: QuizTrackPayload[];
  progress: QuizProgress;
  loggedIn: boolean;
  onCopyLink: () => void;
  onPlayNewQuiz: () => void;
}

export function QuizResults(props: Readonly<QuizResultsProps>) {
  const total = props.tracks.length;
  const correct = scoreFromProgress(props.progress);

  return (
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row gap-3">
        <Button
          class="flex-1"
          variant="info"
          onClick={props.onCopyLink}
        >
          Challenge a friend
        </Button>
        <Button class="flex-1" variant="success" onClick={props.onPlayNewQuiz}>
          Play a new quiz
        </Button>
        {props.loggedIn && (
          <a
            href="/collection"
            class="flex-1 plateau rounded-xl px-4 py-3 text-center no-underline font-medium min-h-11 flex items-center justify-center text-base-900 dark:text-base-100"
          >
            Collection
          </a>
        )}
      </div>
      <div class="plateau rounded-2xl p-6 space-y-2 text-center">
        <p class="text-sm opacity-80">Results</p>
        <p class="text-4xl font-bold tabular-nums">
          {correct} / {total}
        </p>
      </div>
      <ul class="space-y-2">
        {props.tracks.map((track, index) => {
          const progressRow = props.progress.tracks.find(
            (entry) => entry.trackId === track.id,
          );
          if (!progressRow) {
            throw new Error(`Missing progress for track ${track.id}`);
          }
          return (
            <QuizResultRow
              key={track.id}
              index={index}
              title={track.title}
              status={progressRow.status}
            />
          );
        })}
      </ul>
    </div>
  );
}
