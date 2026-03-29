import type { ComponentChildren } from "preact";
import { PillLink } from "../ui/PillLink.tsx";

export interface AdminBackLinkProps {
  href: string;
  children?: ComponentChildren;
}

export function AdminBackLink(props: Readonly<AdminBackLinkProps>) {
  return (
    <PillLink href={props.href} class="w-fit">
      {props.children ?? "Back"}
    </PillLink>
  );
}
