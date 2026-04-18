import { useComputed, useSignal } from "@preact/signals";
import type { CollectionTrack } from "../routes/collection.tsx";
import { AudioPlayer } from "./AudioPlayer.tsx";

const FULL_PLAY_MAX = 86400;

interface Props {
  tracks: CollectionTrack[];
}

export default function CollectionView({ tracks }: Readonly<Props>) {
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
            All
          </button>
          {allCategories.value.map((category) => (
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
              {category}
            </button>
          ))}
        </nav>
      )}
      <p class="text-sm opacity-80">
        {filtered.value.length}{" "}
        {filtered.value.length === 1 ? "track" : "tracks"}
      </p>
      <ul class="flex flex-col gap-3">
        {filtered.value.map((track) => (
          <li key={track.id} class="plateau rounded-2xl p-4 space-y-3">
            <div>
              <p class="font-medium text-base-900 dark:text-base-100">
                {track.title}
              </p>
              {track.categories.length > 0 && (
                <p class="text-xs opacity-70 mt-1">
                  {track.categories.join(", ")}
                </p>
              )}
            </div>
            <AudioPlayer
              audioId={track.id}
              playbackGainDb={track.playbackGainDb}
              playStartSeconds={0}
              maxPlaySeconds={FULL_PLAY_MAX}
              playbackGainSourceSize={track.playbackGainSourceSize}
              playbackGainSourceMtimeMs={track.playbackGainSourceMtimeMs}
              compact
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
