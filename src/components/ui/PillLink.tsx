import type { AnchorHTMLAttributes } from "preact";
import type { IconType } from "react-icons";

/**
 * `pill` is the default label-and-icon shape, `icon` a fixed circular target,
 * and `icon-then-pill` that circle growing into a labelled pill from `sm` up.
 * The icon shapes expect a visually-hidden label, so the link keeps an
 * accessible name at every width.
 */
export type PillShape = "pill" | "icon" | "icon-then-pill";

export interface PillLinkProps extends AnchorHTMLAttributes {
  href: string;
  icon?: IconType;
  variant?:
    | "success"
    | "danger"
    | "warning"
    | "info";
  shape?: PillShape;
}

const baseClass = "plateau rounded-full text-sm no-underline";

const shapeClass: Record<PillShape, string> = {
  pill: "px-4 py-2",
  icon: "flex h-11 w-11 items-center justify-center",
  "icon-then-pill":
    "flex h-11 w-11 items-center justify-center gap-2 sm:w-auto sm:px-4",
};

export function PillLink(props: Readonly<PillLinkProps>) {
  const {
    href,
    class: className,
    children,
    icon: Icon,
    variant,
    shape,
    ...rest
  } = props;
  const resolvedShape = shape ?? "pill";
  const classes = [
    baseClass,
    shapeClass[resolvedShape],
    className,
    resolvedShape === "pill" && Icon && "flex items-center gap-2",
    variant,
  ].filter(Boolean).join(" ");
  return (
    <a href={href} class={classes} {...rest}>
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </a>
  );
}
