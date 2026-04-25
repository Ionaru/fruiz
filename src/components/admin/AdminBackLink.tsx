import type { ComponentChildren } from "preact";
import { FaArrowLeft } from "react-icons/fa6";
import { PillLink } from "../ui/PillLink.tsx";

export interface AdminBackLinkProps {
  href: string;
  children?: ComponentChildren;
}

export function AdminBackLink(props: Readonly<AdminBackLinkProps>) {
  return (
    <PillLink href={props.href} class="w-fit" icon={FaArrowLeft}>
      {props.children ?? "Back"}
    </PillLink>
  );
}
