import type { ComponentChildren } from "preact";

export interface FieldGroupProps {
  label: string;
  htmlFor: string;
  children: ComponentChildren;
}

export function FieldGroup(props: Readonly<FieldGroupProps>) {
  return (
    <div class="space-y-1">
      <label class="text-sm font-medium" htmlFor={props.htmlFor}>
        {props.label}
      </label>
      {props.children}
    </div>
  );
}
