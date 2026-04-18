import { Button } from "../Button.tsx";
import type { InProgressQuizEntry } from "../../lib/types.ts";

export interface InProgressQuizItemProps {
  entry: InProgressQuizEntry;
  onResume: (quizPath: string) => void;
  onDelete: (storageKey: string) => void;
  onShare: (quizPath: string) => void;
}

export function InProgressQuizItem(props: Readonly<InProgressQuizItemProps>) {
  const { entry } = props;
  return (
    <li class="plateau rounded-xl px-3 py-3 space-y-3">
      <div class="text-sm space-y-1 wrap-break-word">
        <p class="font-medium capitalize">{entry.category}</p>
        <p class="opacity-90">
          Difficulty: <span class="capitalize">{entry.difficulty}</span>
        </p>
        <p class="opacity-90">
          Progress: {entry.answered}/{entry.total}
        </p>
        <p class="opacity-80">Quiz code: {entry.slug}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          variant="info"
          class="px-3 py-2 text-sm"
          onClick={() => props.onResume(entry.quizPath)}
        >
          Resume
        </Button>
        <Button
          variant="success"
          class="px-3 py-2 text-sm"
          onClick={() => props.onShare(entry.quizPath)}
        >
          Share
        </Button>
        <Button
          variant="danger"
          class="px-3 py-2 text-sm"
          onClick={() => props.onDelete(entry.storageKey)}
        >
          Delete
        </Button>
      </div>
    </li>
  );
}
