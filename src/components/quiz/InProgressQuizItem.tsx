import { FaLink, FaTrash } from "react-icons/fa6";
import { Button } from "../Button.tsx";
import { ProgressBar } from "../ui/ProgressBar.tsx";
import type { InProgressQuizEntry } from "../../lib/types.ts";

export interface InProgressQuizItemProps {
  entry: InProgressQuizEntry;
  /**
   * Display name for the entry's category. Resumable quizzes are read back from
   * localStorage, which only holds the slug, so the name is resolved against the
   * categories the server sent and falls back to the slug when a quiz outlives
   * its category.
   */
  categoryName: string;
  onResume: (quizPath: string) => void;
  onDelete: (storageKey: string) => void;
  onShare: (quizPath: string) => void;
}

const iconButtonClass = "w-[38px] shrink-0 rounded-full px-0 py-2.5 text-sm";

/**
 * The heading pairs the category name with the quiz code. `capitalize` is
 * scoped to the name — it covers the `nameFromSlug` fallback and must not reach
 * the code, which is case-sensitive. Truncation likewise sits on the name
 * itself: a flex container cannot ellipsize its own children, and the code
 * keeps `shrink-0` so a long name never squeezes it out.
 */
export function InProgressQuizItem(props: Readonly<InProgressQuizItemProps>) {
  const { entry, categoryName } = props;
  return (
    <li class="plateau rounded-2xl px-4 py-3.5">
      <div class="flex items-baseline justify-between gap-2.5">
        <div class="flex min-w-0 items-baseline gap-2">
          <span class="truncate font-medium capitalize">{categoryName}</span>
          <span class="shrink-0 text-xs tabular-nums opacity-50">
            {entry.slug}
          </span>
        </div>
        <span class="shrink-0 text-xs tabular-nums opacity-50">
          <span class="capitalize">{entry.difficulty}</span>
          {` · ${entry.answered} of ${entry.total}`}
        </span>
      </div>
      <ProgressBar
        class="mt-2.5 mb-3"
        value={entry.answered}
        max={entry.total}
        tone={entry.difficulty === "easy" ? "success" : "danger"}
        label={`${categoryName} quiz progress`}
      />
      <div class="flex gap-2">
        <Button
          variant="info"
          class="flex-1 py-2.5 text-sm"
          onClick={() => props.onResume(entry.quizPath)}
        >
          Resume
        </Button>
        <Button
          class={iconButtonClass}
          title="Copy link to this quiz"
          onClick={() => props.onShare(entry.quizPath)}
        >
          <FaLink aria-hidden="true" />
          <span class="sr-only">Copy link to this quiz</span>
        </Button>
        <Button
          class={iconButtonClass}
          title="Delete saved progress"
          onClick={() => props.onDelete(entry.storageKey)}
        >
          <FaTrash aria-hidden="true" />
          <span class="sr-only">Delete saved progress</span>
        </Button>
      </div>
    </li>
  );
}
