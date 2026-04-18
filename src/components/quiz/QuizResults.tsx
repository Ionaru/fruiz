import { Button } from "../Button.tsx";
import { scoreFromProgress } from "../../lib/quizProgress.ts";
import { variantForStatus } from "../../lib/quiz_ui.ts";
import type { QuizProgress, QuizTrackPayload } from "../../lib/types.ts";

export interface QuizResultsProps {
  tracks: QuizTrackPayload[];
  progress: QuizProgress;
  loggedIn: boolean;
  onCopyLink: () => void;
  onPlayAgain: () => void;
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
          Copy quiz link
        </Button>
        <Button class="flex-1" variant="success" onClick={props.onPlayAgain}>
          Play again
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
          const rowVariant = variantForStatus(progressRow.status);
          return (
            <li
              key={track.id}
              class={`plateau rounded-xl px-4 py-3 flex justify-between gap-2 font-bold ${
                rowVariant ? ` ${rowVariant}` : ""
              }`}
            >
              <span class="font-medium truncate">
                {index + 1}: {track.title}
              </span>
              <span class="shrink-0 capitalize opacity-90">
                {progressRow.status}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
