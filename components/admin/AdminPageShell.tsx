import type { ComponentChildren } from "preact";
import { PageShell } from "../layout/PageShell.tsx";

export interface AdminPageShellProps {
  maxWidth?: "xl" | "2xl";
  children: ComponentChildren;
}

const maxWidthClass: Record<
  NonNullable<AdminPageShellProps["maxWidth"]>,
  string
> = {
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

export function AdminPageShell(props: Readonly<AdminPageShellProps>) {
  const mw = maxWidthClass[props.maxWidth ?? "2xl"];
  return (
    <PageShell>
      <div class={`${mw} mx-auto flex flex-col gap-6`}>
        {props.children}
      </div>
    </PageShell>
  );
}
