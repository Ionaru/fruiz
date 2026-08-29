import { FaMagnifyingGlass } from "react-icons/fa6";

export interface CollectionSearchFieldProps {
  value: string;
  onQueryChange: (next: string) => void;
  /**
   * Plain-language result count, announced politely so filtering is perceivable
   * without a visible counter. Not read on every keystroke — the browser
   * coalesces rapid updates to a polite region.
   */
  resultSummary: string;
  class?: string;
}

/**
 * Search across the titles already collected. Locked slots have no title to
 * match, so they drop out while a query is active — see `filterCollectionEntries`.
 */
export function CollectionSearchField(
  props: Readonly<CollectionSearchFieldProps>,
) {
  return (
    <div class={props.class}>
      <div class="plateau nm-dent-sm flex items-center gap-2.5 rounded-full px-4 py-2.5">
        <span class="shrink-0 text-[13px] opacity-40">
          <FaMagnifyingGlass aria-hidden="true" />
        </span>
        <label class="sr-only" for="collection-search">
          Search your tracks
        </label>
        <input
          id="collection-search"
          type="search"
          autocomplete="off"
          placeholder="Search your tracks"
          value={props.value}
          onInput={(event) => props.onQueryChange(event.currentTarget.value)}
          class="w-full min-w-0 border-0 bg-transparent text-sm outline-none placeholder:opacity-40"
        />
      </div>
      <p role="status" aria-live="polite" class="sr-only">
        {props.resultSummary}
      </p>
    </div>
  );
}
