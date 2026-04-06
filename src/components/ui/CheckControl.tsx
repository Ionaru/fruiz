import type { ComponentChildren, InputHTMLAttributes } from "preact";

export const checkableClass =
  "h-4 w-4 shrink-0 accent-emerald-600 dark:accent-emerald-400";

export interface CheckControlProps
  extends Omit<InputHTMLAttributes, "type" | "children"> {
  type: "radio" | "checkbox";
  label: ComponentChildren;
  class?: string;
}

export function CheckControl(props: Readonly<CheckControlProps>) {
  const { label, class: className, ...inputProps } = props;
  const wrapperClass = ["flex items-center gap-2 text-sm", className].filter(
    Boolean,
  ).join(" ");

  return (
    <label class={wrapperClass}>
      <input {...inputProps} type={props.type} class={checkableClass} />
      {label}
    </label>
  );
}
