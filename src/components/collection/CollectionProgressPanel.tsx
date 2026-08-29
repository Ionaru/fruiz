import { ProgressBar } from "../ui/ProgressBar.tsx";
import { formatHiddenTracksLine } from "../../lib/collectionEntries.ts";

export interface CollectionProgressPanelProps {
  collected: number;
  total: number;
  class?: string;
}

/**
 * The page heading and how far the collection has come.
 *
 * The counts stay global even while a category filter is active: they are the
 * page's identity, and each filter already carries its own numbers.
 *
 * Unlike the artboard, this is a plateau card on phones as well as on desktop.
 * `.plateau` is a component-layer class rather than a utility, so `lg:plateau`
 * would generate nothing, and the alternative — rendering the block twice
 * behind `lg:hidden` / `hidden lg:block` — would put two `<h1>`s in the
 * document to show one.
 */
export function CollectionProgressPanel(
  props: Readonly<CollectionProgressPanelProps>,
) {
  const { collected, total } = props;
  const classes = ["plateau rounded-2xl p-4", props.class].filter(Boolean).join(
    " ",
  );
  return (
    <div class={classes}>
      <div class="flex items-baseline justify-between gap-3 lg:block">
        <h1 class="text-[26px] font-semibold leading-8 lg:text-[22px] lg:leading-7">
          Collection
        </h1>
        <p class="shrink-0 text-[13px] tabular-nums lg:mt-1 lg:text-[12.5px]">
          <span class="font-medium">{collected}</span>
          <span class="opacity-55">
            {" of "}
            {total} <span class="hidden lg:inline">tracks collected</span>
          </span>
        </p>
      </div>
      <ProgressBar
        value={collected}
        max={total}
        label="Collection progress"
        class="mt-2.5 lg:mt-3"
      />
      <p class="mt-2 text-xs tabular-nums opacity-45">
        {formatHiddenTracksLine(total - collected)}
      </p>
    </div>
  );
}
