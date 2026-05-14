import { PlateauCard } from "../ui/PlateauCard.tsx";

export interface AdminCategoryListItemProps {
  id: string;
  name: string;
  slug: string;
}

export function AdminCategoryListItem(
  { id, name, slug }: Readonly<AdminCategoryListItemProps>,
) {
  return (
    <li>
      <PlateauCard padding="none" class="rounded-xl px-4 py-3">
        <a
          href={`/admin/categories/${id}`}
          class="flex justify-between gap-2 no-underline"
        >
          <span class="font-medium">{name}</span>
          <span class="text-sm opacity-80">{slug}</span>
        </a>
      </PlateauCard>
    </li>
  );
}
