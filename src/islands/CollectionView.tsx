import { useComputed, useSignal } from "@preact/signals";

import { AudioPlayer } from "./AudioPlayer.tsx";
import {
  CategoryFilterList,
  type CategoryFilterOption,
} from "../components/collection/CategoryFilterList.tsx";
import { CollectionEmptyNotice } from "../components/collection/CollectionEmptyNotice.tsx";
import { CollectionLetterDivider } from "../components/collection/CollectionLetterDivider.tsx";
import { CollectionLockedItem } from "../components/collection/CollectionLockedItem.tsx";
import { CollectionProgressPanel } from "../components/collection/CollectionProgressPanel.tsx";
import { CollectionSearchField } from "../components/collection/CollectionSearchField.tsx";
import {
  CollectionTrackCategories,
  CollectionTrackTitle,
} from "../components/collection/CollectionTrackLabel.tsx";
import {
  type CollectionEntry,
  countLockedEntries,
  filterCollectionEntries,
  groupIntoLetterSections,
} from "../lib/collectionEntries.ts";

/**
 * The collection plays whole tracks rather than quiz clips, so the clip window
 * is opened wide enough never to cut one short.
 */
const FULL_PLAY_MAX = 86400;

export interface CollectionViewProps {
  /** Every categorized track in title order, collected ones named, the rest locked. */
  entries: CollectionEntry[];
  categories: CategoryFilterOption[];
  allTotals: { collected: number; total: number };
}

export default function CollectionView(props: Readonly<CollectionViewProps>) {
  const activeCategory = useSignal<string | null>(null);
  const searchQuery = useSignal("");
  /** Which row owns playback; every other player stops when this changes. */
  const nowPlayingId = useSignal<string | null>(null);

  const inCategory = useComputed(() =>
    filterCollectionEntries(props.entries, {
      category: activeCategory.value,
      query: "",
    })
  );
  const visibleEntries = useComputed(() =>
    filterCollectionEntries(props.entries, {
      category: activeCategory.value,
      query: searchQuery.value,
    })
  );
  const sections = useComputed(() =>
    groupIntoLetterSections(visibleEntries.value)
  );
  const shownTrackCount = useComputed(() =>
    visibleEntries.value.filter((entry) => entry.kind === "collected").length
  );
  const isSearching = useComputed(() => searchQuery.value.trim() !== "");
  const hiddenLockedCount = useComputed(() =>
    countLockedEntries(inCategory.value)
  );
  const resultSummary = useComputed(() =>
    `${shownTrackCount.value} ${
      shownTrackCount.value === 1 ? "track" : "tracks"
    } shown`
  );

  const emptyMessage = useComputed(() => {
    const category = activeCategory.value;
    if (isSearching.value) {
      const scope = category === null
        ? "collected tracks"
        : `${category} tracks`;
      return `No ${scope} match “${searchQuery.value.trim()}”.`;
    }
    return "Nothing here yet. Guess tracks correctly in a quiz to fill this in.";
  });

  return (
    <div class="flex flex-col gap-[18px] lg:grid lg:grid-cols-[270px_minmax(0,1fr)] lg:items-start lg:gap-x-6 lg:gap-y-0">
      {
        /*
        On phones both wrappers are `display: contents`, so their children
        become items of the outer column and `order-*` restores the design's
        sequence: progress, search, filters, list. From `lg` they become the two
        column stacks, which have to flow independently — a four-cell grid would
        make row one as tall as the progress card and push the first track row
        far below the search field.
      */
      }
      <div class="contents lg:flex lg:flex-col lg:gap-4">
        <CollectionProgressPanel
          class="order-1"
          collected={props.allTotals.collected}
          total={props.allTotals.total}
        />
        <CategoryFilterList
          class="order-3"
          options={props.categories}
          allTotals={props.allTotals}
          activeName={activeCategory.value}
          onSelect={(name) => {
            activeCategory.value = name;
          }}
        />
      </div>

      <div class="contents lg:flex lg:flex-col lg:gap-3.5">
        <div class="order-2 flex flex-col gap-1.5">
          <CollectionSearchField
            value={searchQuery.value}
            onQueryChange={(next) => {
              searchQuery.value = next;
            }}
            resultSummary={resultSummary.value}
          />
          {isSearching.value && hiddenLockedCount.value > 0 && (
            <p class="ml-4 text-[11px] opacity-45">
              Locked tracks are hidden while searching.
            </p>
          )}
        </div>

        <div class="order-4 flex flex-col gap-1.5">
          {sections.value.length === 0
            ? (
              <CollectionEmptyNotice
                onClearSearch={isSearching.value
                  ? () => {
                    searchQuery.value = "";
                  }
                  : undefined}
              >
                {emptyMessage.value}
              </CollectionEmptyNotice>
            )
            : sections.value.map((section, sectionIndex) => {
              const headingId = `collection-letter-${sectionIndex}`;
              return (
                <section
                  key={headingId}
                  aria-labelledby={headingId}
                  class="flex flex-col gap-2 pt-1.5 first:pt-0"
                >
                  <CollectionLetterDivider
                    letter={section.letter}
                    id={headingId}
                  />
                  <ul class="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-2.5">
                    {section.entries.map((entry, entryIndex) => (
                      <li
                        key={entry.kind === "collected"
                          ? entry.id
                          : `${headingId}-locked-${entryIndex}`}
                      >
                        {entry.kind === "collected"
                          ? (
                            <AudioPlayer
                              audioId={entry.id}
                              playbackGainDb={entry.playbackGainDb}
                              playStartSeconds={0}
                              maxPlaySeconds={FULL_PLAY_MAX}
                              playbackGainSourceSize={entry
                                .playbackGainSourceSize}
                              playbackGainSourceMtimeMs={entry
                                .playbackGainSourceMtimeMs}
                              lazyLoad
                              pauseInsteadOfStop
                              activePlayerId={nowPlayingId.value}
                              onPlayRequested={() => {
                                nowPlayingId.value = entry.id;
                              }}
                              row={{
                                label: entry.title,
                                primary: (
                                  <CollectionTrackTitle title={entry.title} />
                                ),
                                secondary: (
                                  <CollectionTrackCategories
                                    categories={entry.categories}
                                  />
                                ),
                              }}
                            />
                          )
                          : <CollectionLockedItem />}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
        </div>
      </div>
    </div>
  );
}
