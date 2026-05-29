import { PlateauCard } from "../ui/PlateauCard.tsx";
import { CategoryBadge } from "./CategoryBadge.tsx";
import { SuggestionStatusBadge } from "../SuggestionStatusBadge.tsx";
import type { SuggestionStatus } from "../../lib/suggestionValidation.ts";

export interface AdminSuggestionListItemProps {
  id: string;
  title: string;
  categoryName: string;
  username: string;
  status: SuggestionStatus;
}

export function AdminSuggestionListItem(
  { id, title, categoryName, username, status }: Readonly<
    AdminSuggestionListItemProps
  >,
) {
  return (
    <li>
      <PlateauCard padding="none" class="rounded-xl px-4 py-3">
        <a
          href={`/admin/suggestions/${id}`}
          class="flex flex-wrap items-center justify-between gap-2 no-underline"
        >
          <span class="font-medium min-w-0 break-words">{title}</span>
          <span class="flex items-center gap-2 text-xs opacity-80">
            <CategoryBadge name={categoryName} />
            <span>by {username}</span>
            <SuggestionStatusBadge status={status} />
          </span>
        </a>
      </PlateauCard>
    </li>
  );
}
