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
  return <div class={classes}>{props.children}</div>;
}
