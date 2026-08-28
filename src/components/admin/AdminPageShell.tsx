import type { ComponentChildren } from "preact";
import { PageShell } from "../layout/PageShell.tsx";
import { SiteHeader } from "../layout/SiteHeader.tsx";
import type { AuthUserSnapshot } from "../../utils.ts";

export interface AdminPageShellProps {
  user: AuthUserSnapshot | null;
  currentPath: string;
  children: ComponentChildren;
}

export function AdminPageShell(props: Readonly<AdminPageShellProps>) {
  return (
    <PageShell>
      <div class="max-w-xl mx-auto flex flex-col gap-6">
        <SiteHeader user={props.user} currentPath={props.currentPath} />
        {props.children}
      </div>
    </PageShell>
  );
}
