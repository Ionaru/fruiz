import type { SuggestionRow } from "../lib/trackSuggestions.ts";
import { PlateauCard } from "./ui/PlateauCard.tsx";
import { SuggestionStatusBadge } from "./SuggestionStatusBadge.tsx";

export interface SuggestionStatusListProps {
  suggestions: SuggestionRow[];
}

export function SuggestionStatusList(
  { suggestions }: Readonly<SuggestionStatusListProps>,
) {
  if (suggestions.length === 0) {
    return (
      <p class="text-sm opacity-80 text-base-800 dark:text-base-100">
        You have not suggested any tracks yet.
      </p>
    );
  }
  return (
    <ul class="flex flex-col gap-2">
      {suggestions.map((suggestion) => (
        <li key={suggestion.id}>
          <PlateauCard padding="4" class="space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="font-medium min-w-0 break-words">
                {suggestion.title}
              </span>
              <SuggestionStatusBadge status={suggestion.status} />
            </div>
            <p class="text-xs opacity-70">
              {suggestion.category.name} ·{" "}
              <a
                href={suggestion.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="underline text-inherit break-all"
              >
                link
              </a>
            </p>
            {suggestion.adminNote && (
              <p class="text-sm text-base-800 dark:text-base-100">
                <span class="font-medium">Note from admin:</span>{" "}
                {suggestion.adminNote}
              </p>
            )}
          </PlateauCard>
        </li>
      ))}
    </ul>
  );
}
