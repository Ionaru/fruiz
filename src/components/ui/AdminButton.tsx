import { FaUserShield } from "react-icons/fa";
import { PillLink } from "./PillLink.tsx";

export function AdminButton() {
  return (
    <PillLink href="/admin" icon={FaUserShield}>
      Admin
    </PillLink>
  );
}
