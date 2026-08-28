import type { SelectHTMLAttributes } from "preact";

/**
 * The background color is deliberately opaque rather than `bg-transparent`.
 * `.plateau` paints this control with an opaque gradient, which is a background
 * *image*, so the color underneath never shows on the closed control. The
 * dropdown is what needs it: browsers render the option list themselves and
 * take its background from the select's background *color*, ignoring the
 * gradient. Left transparent, the list falls back to the browser's light
 * default and renders the (near-white) option text on white.
 */
const baseClass =
  "plateau nm-dent-sm rounded-xl px-4 py-3 w-full border-0 bg-base-100 dark:bg-base-800 text-base-900 dark:text-base-100";

export function SelectInput(
  props: Readonly<SelectHTMLAttributes>,
) {
  const { class: className, ...rest } = props;
  const classes = [baseClass, className].filter(Boolean).join(" ");
  return <select {...rest} class={classes} />;
}
