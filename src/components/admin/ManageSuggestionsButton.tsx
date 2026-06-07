import { FaList } from "react-icons/fa6";
import { PillLink } from "../ui/PillLink.tsx";

export function ManageSuggestionsButton() {
  return (
    <PillLink href="/admin/suggestions" icon={FaList}>
      Review suggestions
    </PillLink>
  );
}
