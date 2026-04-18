import type { ComponentChildren } from "preact";

export interface CollectionTrackItemProps {
  title: string;
  categories: string[];
  children: ComponentChildren;
}

export function CollectionTrackItem(
  props: Readonly<CollectionTrackItemProps>,
) {
  return (
    <li class="plateau rounded-2xl p-4 space-y-3">
      <div>
        <p class="font-medium text-base-900 dark:text-base-100">
          {props.title}
        </p>
        {props.categories.length > 0 && (
          <p class="text-xs opacity-70 mt-1">
            {props.categories.join(", ")}
          </p>
        )}
      </div>
      {props.children}
    </li>
  );
}
