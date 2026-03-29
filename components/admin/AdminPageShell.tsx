import type { ComponentChildren } from "preact";
import { PageShell } from "../layout/PageShell.tsx";

export interface AdminPageShellProps {
  children: ComponentChildren;
}

export function AdminPageShell(props: Readonly<AdminPageShellProps>) {
  return (
    <PageShell>
      <div class="max-w-xl mx-auto flex flex-col gap-6">
        {props.children}
      </div>
    </PageShell>
  );
}
