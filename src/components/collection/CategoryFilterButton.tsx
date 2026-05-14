export interface CategoryFilterButtonProps {
  label: string;
  isActive: boolean;
  onSelect: () => void;
}

export function CategoryFilterButton(
  { label, isActive, onSelect }: Readonly<CategoryFilterButtonProps>,
) {
  return (
    <button
      type="button"
      class={`plateau rounded-full px-4 py-2 text-sm whitespace-nowrap min-h-10 ${
        isActive ? "font-bold" : ""
      }`}
      onClick={onSelect}
    >
      {label}
    </button>
  );
}
