import type { ComponentChildren } from "preact";

export interface CheckGroupProps {
  legend: string;
  children: ComponentChildren;
  class?: string;
  optionsClass?: string;
}

export function CheckGroup(props: Readonly<CheckGroupProps>) {
  const fieldsetClass = ["space-y-2", props.class].filter(Boolean).join(" ");
  const optionsClass = ["flex flex-col gap-2", props.optionsClass].filter(
    Boolean,
  ).join(" ");

  return (
    <fieldset class={fieldsetClass}>
      <legend class="text-sm font-medium">{props.legend}</legend>
      <div class={optionsClass}>{props.children}</div>
    </fieldset>
  );
}
