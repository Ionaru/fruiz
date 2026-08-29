import type { ButtonHTMLAttributes } from "preact";

/**
 * `pill` is the fully rounded default. `card` is the softer-cornered rectangle
 * the difficulty buttons use, where two buttons sit side by side and share a
 * card's worth of width — a full pill radius at that size reads as a lozenge
 * rather than as a tappable panel.
 */
export type ButtonShape = "pill" | "card";

export interface ButtonProps extends ButtonHTMLAttributes {
  variant?:
    | "success"
    | "danger"
    | "warning"
    | "info";
  shape?: ButtonShape;
}

const shapeClass: Record<ButtonShape, string> = {
  pill: "rounded-full p-4",
  card: "rounded-[14px] px-2.5 py-3",
};

export function Button(props: Readonly<ButtonProps>) {
  const { variant, class: className, type, shape, ...rest } = props;
  const baseClasses = "plateau flex items-center justify-center";
  const disabledClasses = "opacity-50 pointer-events-none";

  const classes = [
    baseClasses,
    shapeClass[shape ?? "pill"],
    variant,
    className,
    props.disabled && disabledClasses,
  ].filter(Boolean).join(" ");
  return <button {...rest} type={type ?? "button"} class={classes} />;
}
