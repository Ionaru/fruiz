import { FaList } from "react-icons/fa";
import { PillLink } from "./PillLink.tsx";

export function CollectionButton() {
  return (
    <PillLink href="/collection" icon={FaList} variant="info">
      Collection
    </PillLink>
  );
}
