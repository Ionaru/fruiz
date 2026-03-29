import type { JSX } from "preact";

export interface PillLinkProps extends JSX.HTMLAttributes<HTMLAnchorElement> {
  href: string;
}

const baseClass = "plateau rounded-full px-4 py-2 text-sm no-underline";

export function PillLink(props: Readonly<PillLinkProps>) {
  const { href, class: className, children, ...rest } = props;
  const classes = [baseClass, className].filter(Boolean).join(" ");
  return (
    <a href={href} class={classes} {...rest}>
      {children}
    </a>
  );
}
