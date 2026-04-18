import { FaUser } from "react-icons/fa";
import { PillLink } from "./PillLink.tsx";

export function AccountButton() {
  return (
    <PillLink href="/account" icon={FaUser}>
      Account
    </PillLink>
  );
}
