import { variantForStatus } from "../../lib/quiz_ui.ts";
import type { TrackStatus } from "../../lib/types.ts";

export interface QuizResultRowProps {
  index: number;
  title: string;
  status: TrackStatus;
}

export function QuizResultRow(
  { index, title, status }: Readonly<QuizResultRowProps>,
) {
  const rowVariant = variantForStatus(status);
  return (
    <li
      class={`plateau rounded-xl px-4 py-3 flex justify-between gap-2 font-bold ${
        rowVariant ? ` ${rowVariant}` : ""
      }`}
    >
      <span class="font-medium truncate">
        {index + 1}: {title}
      </span>
      <span class="shrink-0 capitalize opacity-90">{status}</span>
    </li>
  );
}
