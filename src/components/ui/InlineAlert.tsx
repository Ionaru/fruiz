import type { ComponentChildren } from "preact";

export type InlineAlertVariant = "error" | "neutral" | "success";

export interface InlineAlertProps {
  variant: InlineAlertVariant;
  role?: "alert" | "status";
  children: ComponentChildren;
  class?: string;
}

const variantClass: Record<InlineAlertVariant, string> = {
  error: "text-sm text-red-800 dark:text-red-200",
  neutral: "text-sm text-base-800 dark:text-base-100",
  success: "text-sm text-green-800 dark:text-green-200",
};

export function InlineAlert(props: Readonly<InlineAlertProps>) {
  const { variant, role, children, class: className } = props;
  const classes = [variantClass[variant], className].filter(Boolean).join(" ");
  return (
    <p class={classes} role={role}>
      Error: {children}
    </p>
  );
}
