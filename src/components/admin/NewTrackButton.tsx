import { FaPlus } from "react-icons/fa";
import { PillLink } from "../ui/PillLink.tsx";

export function NewTrackButton() {
  return (
    <PillLink href="/admin/tracks/new" icon={FaPlus}>
      New track
    </PillLink>
  );
}
