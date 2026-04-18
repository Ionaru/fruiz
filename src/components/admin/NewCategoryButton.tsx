import { FaPlus } from "react-icons/fa";
import { PillLink } from "../ui/PillLink.tsx";

export function NewCategoryButton() {
  return (
    <PillLink href="/admin/categories/new" icon={FaPlus}>
      New category
    </PillLink>
  );
}
