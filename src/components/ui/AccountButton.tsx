import { FaUser } from "react-icons/fa6";
import { PillLink } from "./PillLink.tsx";

export function AccountButton() {
  return (
    <PillLink href="/account" icon={FaUser}>
      Account
    </PillLink>
  );
}
