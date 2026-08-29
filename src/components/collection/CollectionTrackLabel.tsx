/**
 * The two lines of a collection row's label column.
 *
 * They are separate exports because the row's card is rendered by
 * `AudioPlayer` — the glow, the waveform swap and the pause glyph all depend on
 * playback state that only the island holds — so it takes the title and the
 * subtitle as slots rather than a single block.
 */

export interface CollectionTrackTitleProps {
  title: string;
}

export function CollectionTrackTitle(
  props: Readonly<CollectionTrackTitleProps>,
) {
  return (
    <p class="truncate text-[14.5px] font-medium lg:text-sm">{props.title}</p>
  );
}

export interface CollectionTrackCategoriesProps {
  categories: string[];
}

/**
 * Middot-separated rather than comma-separated: the separator has to stay
 * legible at 11.5px against a half-opacity foreground, and a comma disappears.
 */
export function CollectionTrackCategories(
  props: Readonly<CollectionTrackCategoriesProps>,
) {
  if (props.categories.length === 0) return null;
  return (
    <p class="mt-0.5 truncate text-[11.5px] opacity-50">
      {props.categories.join(" · ")}
    </p>
  );
}
