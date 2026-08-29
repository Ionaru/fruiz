import { FaLock } from "react-icons/fa6";

/**
 * A track the player has not collected yet, holding the place its title would
 * occupy so a letter group reads as a set with gaps in it rather than a list
 * that happens to be short.
 *
 * It names nothing. The row exists to say "something belongs here", and saying
 * which track would hand over a quiz answer.
 *
 * Deliberately not a button: there is nothing to activate, so it stays out of
 * the tab order and the lock glyph is decorative — the text carries the state.
 *
 * The slot has no card of its own. A page of these is mostly gaps, and a tile
 * apiece made the list read as busy, so the row sits straight on the page the
 * way the progress block above it does. Its padding still matches a collected
 * row's, so the text and the badge stay in the same columns.
 *
 * The badge is the row's only relief — a dent pressed into the page rather than
 * a disc laid on it — so the slot still reads as a place with something missing
 * from it instead of as an empty gap.
 */
export function CollectionLockedItem() {
  return (
    <div class="flex items-center gap-3 py-2.5 pl-4 pr-3">
      <div class="min-w-0 flex-1">
        {
          /*
          The artboard was drawn dark-only, where 30% of the foreground on a
          near-black ground still reads. The same opacity over a light ground
          does not, so light mode gets a stronger value and dark mode keeps the
          designed one.
        */
        }
        <p class="truncate text-[14.5px] font-medium opacity-50 lg:text-sm dark:opacity-30">
          Not collected yet
        </p>
        {
          /*
          Hidden from assistive technology on purpose: the hint is identical on
          every locked slot, and a screen reader working down a list of 126 of
          them should hear "Not collected yet" each time, not the same sentence
          of advice repeated.
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
        no fill of its own to lift it off the background. Only the dark scheme
        needs its colours named — `nm-dent-sm`'s defaults are what `.plateau`
        uses in light mode anyway — and the highlight is dialled well below
        `.plateau`'s, which reads as a bright ring with no surface around it.
      */
      }
      <span class="nm-dent-sm flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs opacity-45 dark:nm-shadow-base-950/70 dark:nm-highlight-base-700/20 dark:opacity-30">
        <FaLock aria-hidden="true" />
      </span>
    </div>
  );
}
