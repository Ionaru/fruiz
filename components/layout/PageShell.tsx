import type { ComponentChildren } from "preact";

export interface PageShellProps {
  paddingY?: "6" | "8";
  children: ComponentChildren;
}

export function PageShell(props: Readonly<PageShellProps>) {
  const py = props.paddingY === "6" ? "py-6" : "py-8";
  return (
    <div
      class={`min-h-screen bg-base-200 dark:bg-base-800 px-4 text-base-900 dark:text-base-100 ${py}`}
    >
      {props.children}
    </div>
  );
}
