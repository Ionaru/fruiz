import type { SuggestionStatus } from "../lib/suggestionValidation.ts";

export interface SuggestionStatusBadgeProps {
  status: SuggestionStatus;
}

const statusClass: Record<SuggestionStatus, string> = {
  pending: "bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-100",
  approved: "bg-green-200 text-green-950 dark:bg-green-900 dark:text-green-100",
  denied: "bg-red-200 text-red-950 dark:bg-red-900 dark:text-red-100",
};

export function SuggestionStatusBadge(
  { status }: Readonly<SuggestionStatusBadgeProps>,
) {
  return (
    <span
      class={`px-2 py-0.5 rounded-md text-xs font-medium capitalize w-max ${
        statusClass[status]
      }`}
    >
      {status}
    </span>
  );
}
