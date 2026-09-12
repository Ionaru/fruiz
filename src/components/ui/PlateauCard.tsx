import type { ComponentChildren } from "preact";

export interface PlateauCardProps {
  padding?: "none" | "4" | "5" | "6";
  class?: string;
  children: ComponentChildren;
  variant?:
    | "success"
    | "danger"
    | "warning"
    | "info";
  /**
   * Renders the card as a link to this destination instead of a `div`. Use it
   * when the whole card is the target: the card then carries the hover and
   * pressed relief `.plateau` gives every control, and its padding becomes part
   * of the click target rather than a dead margin around a link inside it.
   *
   * Only for cards with nothing else interactive in them: a link may not
   * contain a button.
   */
  href?: string;
}

const paddingClass: Record<NonNullable<PlateauCardProps["padding"]>, string> = {
  "none": "",
  "4": "p-4",
  "5": "p-5",
  "6": "p-6",
};

export function PlateauCard(props: Readonly<PlateauCardProps>) {
  const pad = paddingClass[props.padding ?? "6"];
  const classes = ["plateau", "rounded-2xl", pad, props.variant, props.class]
    .filter(Boolean)
    .join(" ");
  if (props.href !== undefined) {
    return (
      <a href={props.href} class={`${classes} no-underline`}>
        {props.children}
      </a>
    );
  }
  return <div class={classes}>{props.children}</div>;
}
