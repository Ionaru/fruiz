import type { ComponentChildren } from "preact";

export interface FieldGroupProps {
  label: string;
  htmlFor: string;
  children: ComponentChildren;
  center?: boolean;
}

export function FieldGroup(props: Readonly<FieldGroupProps>) {
  const wrapperClass = ["space-y-1", props.center ? "text-center" : ""].filter(
    Boolean,
  ).join(" ");
  return (
    <div class={wrapperClass}>
      <label class="text-sm font-medium" htmlFor={props.htmlFor}>
        {props.label}
      </label>
      {props.children}
    </div>
  );
}
