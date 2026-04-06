import type { SelectHTMLAttributes } from "preact";

const baseClass =
  "plateau nm-dent-sm rounded-xl px-4 py-3 w-full border-0 bg-transparent text-base-900 dark:text-base-100";

export function SelectInput(
  props: Readonly<SelectHTMLAttributes>,
) {
  const { class: className, ...rest } = props;
  const classes = [baseClass, className].filter(Boolean).join(" ");
  return <select {...rest} class={classes} />;
}
