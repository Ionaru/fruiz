import { useSignal } from "@preact/signals";
import type { CategoryRow } from "../lib/categories.ts";

const checkableClass =
  "h-4 w-4 shrink-0 accent-emerald-600 dark:accent-emerald-400";

export interface TrackCategoriesPickProps {
  categories: CategoryRow[];
  initialSelectedIds: string[];
}

/**
 * Client island: checkbox `defaultChecked` is cleared by hydration on admin
 * pages; controlled checkboxes preserve server selections and stay togglable.
 */
export default function TrackCategoriesPick(
  props: Readonly<TrackCategoriesPickProps>,
) {
  const initial = (props.initialSelectedIds ?? []).map(String);
  const selectedIds = useSignal<string[]>([...initial]);

  const setCategoryChecked = (id: string, checked: boolean) => {
    const next = new Set(selectedIds.value);
    if (checked) next.add(id);
    else next.delete(id);
    selectedIds.value = [...next];
  };

  return (
    <fieldset class="space-y-2">
      <legend class="text-sm font-medium">Categories</legend>
      <div class="flex flex-col gap-2">
        {props.categories.map((c) => {
          const id = String(c.id);
          return (
            <label key={id} class="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="categoryIds"
                value={id}
                class={checkableClass}
                checked={selectedIds.value.includes(id)}
                onInput={(ev) => {
                  const el = ev.currentTarget as HTMLInputElement;
                  setCategoryChecked(id, el.checked);
                }}
              />
              {c.name}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
