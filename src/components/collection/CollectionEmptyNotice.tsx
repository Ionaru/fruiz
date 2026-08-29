import type { ComponentChildren } from "preact";
import { Button } from "../Button.tsx";

export interface CollectionEmptyNoticeProps {
  children: ComponentChildren;
  /** Shows a "Clear search" action when given. */
  onClearSearch?: () => void;
}

/**
 * Stands in for the list when nothing matches. A 241-row page whose query
 * matches nothing is otherwise a dead end, so an active search gets a way back
 * out of it.
 */
export function CollectionEmptyNotice(
  props: Readonly<CollectionEmptyNoticeProps>,
) {
  return (
    <div class="plateau flex flex-col items-center gap-3 rounded-2xl p-6 text-center">
      <p class="text-sm opacity-80">{props.children}</p>
      {props.onClearSearch !== undefined && (
        <Button
          class="px-4 py-2 text-sm"
          variant="info"
          onClick={props.onClearSearch}
        >
          Clear search
        </Button>
      )}
    </div>
  );
}
