import type { ComponentChildren } from "preact";

export interface SectionHeadingProps {
  children: ComponentChildren;
  class?: string;
}

/**
 * Small caps label that separates the menu's sections. It is deliberately
 * quieter than the category names beneath it: the cards are what you act on, so
 * the heading only has to say which group you are looking at.
 */
export function SectionHeading(props: Readonly<SectionHeadingProps>) {
  const classes = [
    "m-0 text-[13px] leading-4 font-semibold uppercase tracking-[0.09em] opacity-45",
    props.class,
  ].filter(Boolean).join(" ");
  return <h2 class={classes}>{props.children}</h2>;
}
