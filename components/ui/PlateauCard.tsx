import type { ComponentChildren } from "preact";

export interface PlateauCardProps {
  padding?: "5" | "6";
  class?: string;
  children: ComponentChildren;
}

const paddingClass: Record<NonNullable<PlateauCardProps["padding"]>, string> = {
  "5": "p-5",
  "6": "p-6",
};

export function PlateauCard(props: Readonly<PlateauCardProps>) {
  const pad = paddingClass[props.padding ?? "6"];
  const classes = ["plateau", "rounded-2xl", pad, props.class].filter(Boolean)
    .join(" ");
  return <div class={classes}>{props.children}</div>;
}
