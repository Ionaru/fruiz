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
 */
export function CollectionLockedItem() {
  return (
    <div class="plateau nm-dent-sm flex items-center gap-3 rounded-[14px] py-2.5 pl-4 pr-3">
      <div class="min-w-0 flex-1">
        {
          /*
          The artboard was drawn dark-only, where 30% white on a near-black card
          still reads. The same opacity over a light plateau does not, so light
          mode gets a stronger value and dark mode keeps the designed one.
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
      <span class="plateau nm-dent-sm flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs opacity-45 dark:opacity-30">
        <FaLock aria-hidden="true" />
      </span>
    </div>
  );
}
