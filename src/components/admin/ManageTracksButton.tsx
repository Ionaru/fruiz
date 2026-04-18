import { FaList } from "react-icons/fa";
import { PillLink } from "../ui/PillLink.tsx";

export function ManageTracksButton() {
  return (
    <PillLink href="/admin/tracks" icon={FaList}>
      Manage tracks
    </PillLink>
  );
}
