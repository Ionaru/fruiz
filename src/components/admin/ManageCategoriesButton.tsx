import { FaList } from "react-icons/fa";
import { PillLink } from "../ui/PillLink.tsx";

export function ManageCategoriesButton() {
  return (
    <PillLink href="/admin/categories" icon={FaList}>
      Manage categories
    </PillLink>
  );
}
