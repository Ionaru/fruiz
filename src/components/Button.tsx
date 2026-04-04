import type { ButtonHTMLAttributes } from "preact";

export interface ButtonProps extends ButtonHTMLAttributes {
  variant?:
    | "success"
    | "danger"
    | "warning"
    | "info";
}

export function Button(props: Readonly<ButtonProps>) {
  const { variant, class: className, type, ...rest } = props;
  const baseClasses = "plateau rounded-full p-4";
  const disabledClasses = "opacity-50 pointer-events-none";

  const classes = [
    baseClasses,
    variant,
    className,
    props.disabled && disabledClasses,
  ].filter(Boolean).join(" ");
  return <button {...rest} type={type ?? "button"} class={classes} />;
}
