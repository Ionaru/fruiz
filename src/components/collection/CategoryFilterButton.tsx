export interface CategoryFilterButtonProps {
  /** Display label — a category name, or "All" for the unfiltered view. */
  label: string;
  collected: number;
  total: number;
  isActive: boolean;
  onSelect: () => void;
}

/**
 * One category toggle. A pill in the mobile filter row, a full-width row in the
 * desktop sidebar — one control rendered once, because two copies would give
 * assistive technology two competing filter groups for the same state.
 *
 * The active state carries the `info` plateau tint as well as the heavier
 * weight, and reports `aria-pressed`, so it is not signalled by boldness alone.
 */
export function CategoryFilterButton(
  props: Readonly<CategoryFilterButtonProps>,
) {
  const { label, collected, total, isActive } = props;
  return (
    <button
      type="button"
      // Explicit strings, not a boolean: Preact renders `aria-pressed={true}`
      // as a bare valueless attribute and drops it entirely when false, so a
      // boolean leaves the control not exposed as a toggle at all.
      aria-pressed={isActive ? "true" : "false"}
      aria-label={`${label}, ${collected} of ${total} collected`}
      onClick={props.onSelect}
      class={`plateau flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13.5px] lg:w-full lg:justify-between lg:gap-2.5 lg:rounded-xl lg:px-3.5 ${
        isActive ? "info font-semibold" : ""
      }`}
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        class={`tabular-nums ${
          isActive ? "font-normal opacity-75" : "opacity-55"
        }`}
      >
        <span class="lg:hidden">{collected}</span>
        <span class="hidden lg:inline">{collected} / {total}</span>
      </span>
    </button>
  );
}
