import type { ComponentChildren } from "preact";
import { PlateauCard } from "../ui/PlateauCard.tsx";
import { CategoryBadge } from "./CategoryBadge.tsx";

export interface AdminTrackListItemProps {
  id: string;
  title: string;
  difficulty: string;
  categoryNames: string[];
  children: ComponentChildren;
}

export function AdminTrackListItem(
  { id, title, difficulty, categoryNames, children }: Readonly<
    AdminTrackListItemProps
  >,
) {
  return (
    <li>
      <PlateauCard
        padding="none"
        class="rounded-xl px-4 py-3 flex flex-wrap items-center gap-3"
      >
        <div class="shrink-0">{children}</div>
        <a
          href={`/admin/tracks/${id}`}
          class="grid flex-1 min-w-0 items-center gap-2 no-underline grid-cols-[minmax(0,1fr)_5rem_8.5rem] md:grid-cols-[minmax(0,1fr)_6rem_12rem]"
        >
          <span class="font-medium min-w-0 truncate">{title}</span>
          <span class="text-sm opacity-80 capitalize text-right">
            {difficulty}
          </span>
          {categoryNames.length > 0
            ? (
              <div class="text-xs opacity-70 flex flex-col gap-1 items-end">
                {categoryNames.map((category) => (
                  <CategoryBadge key={category} name={category} />
                ))}
              </div>
            )
            : (
              <span class="text-xs opacity-70 text-right truncate">
                <span class="bg-red-300 dark:bg-red-900 px-1.5 py-0.5 rounded-md">
                  Uncategorized
                </span>
              </span>
            )}
        </a>
      </PlateauCard>
    </li>
  );
}
