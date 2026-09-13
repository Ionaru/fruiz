import type { AnchorHTMLAttributes } from "preact";

export interface ButtonLinkProps extends AnchorHTMLAttributes {
  href: string;
  variant?:
    | "success"
    | "danger"
    | "warning"
    | "info";
}

/**
 * A destination that reads as a button: the full-width, soft-cornered block the
 * account pages and the results screen stack beside real `Button`s.
 *
 * It exists so those call sites cannot drift apart: a control that looks like a
 * button has to behave like one. The hover and pressed relief comes from
 * `.plateau` in `styles.css`, which treats a link and a button alike.
 *
 * `PillLink` is the other link shape, a compact pill for navigation bars. Use
 * this one where a link sits in a column of buttons.
 */
const baseClass =
  "plateau flex min-h-11 items-center justify-center rounded-xl px-4 py-3 text-center font-medium no-underline text-base-900 dark:text-base-100";

export function ButtonLink(props: Readonly<ButtonLinkProps>) {
  const { href, class: className, children, variant, ...rest } = props;
  const classes = [baseClass, variant, className].filter(Boolean).join(" ");
  return (
    <a href={href} class={classes} {...rest}>
      {children}
    </a>
  );
}
