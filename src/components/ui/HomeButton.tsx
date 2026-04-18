import { FaHome } from "react-icons/fa";
import { PillLink } from "./PillLink.tsx";

export function HomeButton() {
  return (
    <PillLink href="/" icon={FaHome}>
      Home
    </PillLink>
  );
}
