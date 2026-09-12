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
      <PlateauCard
        href={`/admin/categories/${id}`}
        padding="none"
        class="rounded-xl px-4 py-3 flex justify-between gap-2"
      >
        <span class="font-medium">{name}</span>
        <span class="text-sm opacity-80">{slug}</span>
      </PlateauCard>
    </li>
  );
}
