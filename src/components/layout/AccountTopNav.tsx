import { SiteHeader } from "./SiteHeader.tsx";
import type { AuthUserSnapshot } from "../../utils.ts";

export interface AccountTopNavProps {
  user: AuthUserSnapshot | null;
  currentPath: string;
}

/**
 * Site header constrained to the account column so it lines up with the cards
 * the account pages render beneath it.
 */
export function AccountTopNav(props: Readonly<AccountTopNavProps>) {
  return (
    <div class="max-w-md mx-auto mb-6">
      <SiteHeader user={props.user} currentPath={props.currentPath} />
    </div>
  );
}
