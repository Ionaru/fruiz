import type { AnchorHTMLAttributes } from "preact";
import type { IconType } from "react-icons";

/**
 * `pill` is the default label-and-icon shape. `icon` is a fixed circular target
 * that only shows its icon, and `icon-then-pill` starts as that circle and
 * grows into a labelled pill from the `sm` breakpoint up. The icon-based shapes
 * expect the label to be passed as visually-hidden text so the link keeps an
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
