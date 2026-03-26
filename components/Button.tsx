import type { ButtonHTMLAttributes } from "preact";

export interface ButtonProps extends ButtonHTMLAttributes {
  variant?:
    | "success"
    | "danger"
    | "warning"
    | "info"
}

export function Button(props: Readonly<ButtonProps>) {
  return <button {...props} class={`plateau rounded-full p-4 ${props.variant}`} />;
}
