import type { CategoryRow } from "../lib/categories.ts";
import CheckboxGroupField from "./CheckboxGroupField.tsx";

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
  return (
    <CheckboxGroupField
      legend="Categories"
      name="categoryIds"
      options={props.categories.map((category) => ({
        value: String(category.id),
        label: category.name,
      }))}
      initialValues={(props.initialSelectedIds ?? []).map(String)}
    />
  );
}
