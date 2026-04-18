import type { AnchorHTMLAttributes } from "preact";
import type { IconType } from "react-icons";

export interface PillLinkProps extends AnchorHTMLAttributes {
  href: string;
  icon?: IconType;
  variant?:
    | "success"
    | "danger"
    | "warning"
    | "info";
}

const baseClass = "plateau rounded-full px-4 py-2 text-sm no-underline";

export function PillLink(props: Readonly<PillLinkProps>) {
  const { href, class: className, children, icon: Icon, variant, ...rest } =
    props;
  const classes = [
    baseClass,
    className,
    Icon && "flex items-center gap-2",
    variant,
  ].filter(Boolean).join(" ");
  return (
    <a href={href} class={classes} {...rest}>
      {Icon && <Icon />}
      {children}
    </a>
  );
}
