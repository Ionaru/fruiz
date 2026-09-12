import { FaLock } from "react-icons/fa6";

/**
 * A track the player has not collected yet, holding the place its title would
 * occupy so a letter group reads as a set with gaps rather than a short list.
 *
 * It names nothing: saying which track would hand over a quiz answer. Not a
 * button either, so it stays out of the tab order and the lock glyph is
 * decorative.
 *
 * The slot has no card of its own (a page of these is mostly gaps, and a tile
 * apiece read as busy) but keeps a collected row's padding so text and badge
 * stay in the same columns. The badge is its only relief, a dent pressed into
 * the page rather than a disc laid on it.
 */
export function CollectionLockedItem() {
  return (
    <div class="flex items-center gap-3 py-2.5 pl-4 pr-3">
      <div class="min-w-0 flex-1">
        {
          /*
          30% of the foreground reads on a near-black ground but not on a light
          one, so light mode gets a stronger value than the designed opacity.
        */
        }
        <p class="truncate text-[14.5px] font-medium opacity-50 lg:text-sm dark:opacity-30">
          Not collected yet
        </p>
        {
          /*
          Hidden from assistive technology: the hint is identical on every
          locked slot, so a screen reader working down the list would repeat the
          same sentence of advice after every "Not collected yet".
        */
        }
        <p
          aria-hidden="true"
          class="mt-0.5 truncate text-[11.5px] opacity-40 dark:opacity-20"
        >
          Guess it right in a quiz to unlock
        </p>
      </div>
      {
        /*
        No `plateau`: the dent is pressed into the page itself, so the badge has
        no fill to lift it off the background. Only the dark scheme names its
        colours (`nm-dent-sm`'s defaults match `.plateau` in light mode), with
        the highlight well below `.plateau`'s, which would read as a bright ring
        around no surface.
      */
      }
      <span class="nm-dent-sm flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs opacity-45 dark:nm-shadow-base-950/70 dark:nm-highlight-base-700/20 dark:opacity-30">
        <FaLock aria-hidden="true" />
      </span>
    </div>
  );
}
