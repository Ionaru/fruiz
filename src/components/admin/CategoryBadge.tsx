export interface CategoryBadgeProps {
  name: string;
}

export function CategoryBadge({ name }: Readonly<CategoryBadgeProps>) {
  return (
    <span class="bg-blue-300 dark:bg-blue-900 px-1.5 py-0.5 rounded-md w-max">
      {name}
    </span>
  );
}
