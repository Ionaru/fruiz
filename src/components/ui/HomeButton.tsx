import { FaHouse } from "react-icons/fa6";
import { PillLink } from "./PillLink.tsx";

export function HomeButton() {
  return (
    <PillLink href="/" icon={FaHouse}>
      Home
    </PillLink>
  );
}
