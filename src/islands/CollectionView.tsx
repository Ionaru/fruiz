import { useComputed, useSignal } from "@preact/signals";
import { CollectionTrackItem } from "../components/collection/CollectionTrackItem.tsx";
import type { CategoryCount, CollectionTrack } from "../routes/collection.tsx";
import { AudioPlayer } from "./AudioPlayer.tsx";

const FULL_PLAY_MAX = 86400;

interface Props {
  tracks: CollectionTrack[];
  categoryCounts: Record<string, CategoryCount>;
  allTotals: { collected: number; total: number };
}

export default function CollectionView(
  { tracks, categoryCounts, allTotals }: Readonly<Props>,
) {
  const activeCategory = useSignal<string | null>(null);

  const allCategories = useComputed(() => {
    const set = new Set<string>();
    for (const track of tracks) {
      for (const category of track.categories) set.add(category);
    }
    return [...set].sort();
  });

  const filtered = useComputed(() => {
    const cat = activeCategory.value;
    if (!cat) return tracks;
    return tracks.filter((track) => track.categories.includes(cat));
  });

  return (
    <div class="flex flex-col gap-4">
      {allCategories.value.length > 1 && (
        <nav class="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            type="button"
            class={`plateau rounded-full px-4 py-2 text-sm whitespace-nowrap min-h-10 ${
              activeCategory.value === null ? "font-bold" : ""
            }`}
            onClick={() => {
              activeCategory.value = null;
            }}
          >
            All ({allTotals.collected}/{allTotals.total})
          </button>
          {allCategories.value.map((category) => {
            const count = categoryCounts[category];
            return (
              <button
                key={category}
                type="button"
                class={`plateau rounded-full px-4 py-2 text-sm whitespace-nowrap min-h-10 ${
                  activeCategory.value === category ? "font-bold" : ""
                }`}
                onClick={() => {
                  activeCategory.value = category;
                }}
              >
                {count
                  ? `${category} (${count.collected}/${count.total})`
                  : category}
              </button>
            );
          })}
        </nav>
      )}
      <p class="text-sm opacity-80">
        {filtered.value.length}{" "}
        {filtered.value.length === 1 ? "track" : "tracks"}
      </p>
      <ul class="flex flex-col gap-3">
        {filtered.value.map((track) => (
          <CollectionTrackItem
            key={track.id}
            title={track.title}
            categories={track.categories}
          >
            <AudioPlayer
              audioId={track.id}
              playbackGainDb={track.playbackGainDb}
              playStartSeconds={0}
              maxPlaySeconds={FULL_PLAY_MAX}
              playbackGainSourceSize={track.playbackGainSourceSize}
              playbackGainSourceMtimeMs={track.playbackGainSourceMtimeMs}
              compact
            />
          </CollectionTrackItem>
        ))}
      </ul>
    </div>
  );
}
