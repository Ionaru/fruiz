import { SectionHeading } from "../ui/SectionHeading.tsx";
import { CategoryFilterButton } from "./CategoryFilterButton.tsx";

export interface CategoryFilterOption {
  name: string;
  collected: number;
  total: number;
}

export interface CategoryFilterListProps {
  options: CategoryFilterOption[];
  allTotals: { collected: number; total: number };
  /** Selected category name, or `null` for "All". */
  activeName: string | null;
  onSelect: (name: string | null) => void;
  class?: string;
}

/**
 * The category filters: a horizontally scrolling pill row on phones, a labelled
 * sidebar list from `lg`. They are toggles rather than links, so this is a
 * `role="group"` and not a `<nav>`.
 *
 * Every category is offered, including ones nothing has been collected from —
 * a fully locked category is now the most informative filter on the page.
 */
export function CategoryFilterList(props: Readonly<CategoryFilterListProps>) {
  const { options, allTotals, activeName } = props;
  return (
    <div class={props.class}>
      <SectionHeading class="mb-2 ml-0.5 hidden lg:block">
        Categories
      </SectionHeading>
      <div
        role="group"
        aria-label="Filter tracks by category"
        // `overflow-x: auto` forces the other axis to clip too, so the inset
        // has to be matched on all four sides: the padding gives the pills'
        // shadows room inside the scroll container and the negative margin
        // takes the same space back out of the layout.
        class="-m-1.5 flex gap-2.5 overflow-x-auto p-1.5 lg:m-0 lg:flex-col lg:overflow-x-visible lg:p-0"
      >
        <CategoryFilterButton
          label="All"
          collected={allTotals.collected}
          total={allTotals.total}
          isActive={activeName === null}
          onSelect={() => props.onSelect(null)}
        />
        {options.map((option) => (
          <CategoryFilterButton
            key={option.name}
            label={option.name}
            collected={option.collected}
            total={option.total}
            isActive={activeName === option.name}
            onSelect={() => props.onSelect(option.name)}
          />
        ))}
      </div>
    </div>
  );
}
