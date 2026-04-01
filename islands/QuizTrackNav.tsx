import type { Signal } from "@preact/signals";
import { useSignal } from "@preact/signals";
import { Button } from "../components/Button.tsx";
import { variantForStatus } from "../lib/quiz_ui.ts";
import type { QuizProgress, QuizTrackPayload } from "../lib/types.ts";

interface Props {
  tracks: QuizTrackPayload[];
  activeId: Signal<string | null>;
  answerDraft: Signal<string>;
  progress: Signal<QuizProgress>;
}

export default function QuizTrackNav(props: Readonly<Props>) {
  const trackNavExpanded = useSignal(false);

  const selectTrack = (trackId: string) => {
    const progressRow = props.progress.value.tracks.find(
      (entry) => entry.trackId === trackId,
    );
    if (!progressRow) return;
    props.activeId.value = trackId;
    props.answerDraft.value = progressRow.selectedTitle ?? "";
  };

  const activeIndex = () => {
    const id = props.activeId.value;
    if (!id) return -1;
    return props.tracks.findIndex((track) => track.id === id);
  };

  const goPrev = () => {
    const i = activeIndex();
    if (i <= 0) return;
    const prev = props.tracks[i - 1];
    if (!prev) return;
    selectTrack(prev.id);
  };

  const goNext = () => {
    const i = activeIndex();
    if (i < 0 || i >= props.tracks.length - 1) return;
    const next = props.tracks[i + 1];
    if (!next) return;
    selectTrack(next.id);
  };

  const total = props.tracks.length;
  const idx = activeIndex();
  const prevDisabled = idx <= 0;
  const nextDisabled = idx < 0 || idx >= total - 1;

  return (
    <div class="space-y-2">
      {trackNavExpanded.value
        ? (
          <>
            <section
              class="grid grid-cols-4 sm:grid-cols-5 gap-2"
            >
              {props.tracks.map((track, trackIndex) => {
                const progressRow = props.progress.value.tracks.find(
                  (entry) => entry.trackId === track.id,
                )!;
                const isActiveTrack = props.activeId.value === track.id;
                return (
                  <Button
                    key={track.id}
                    class={`min-w-0 aspect-square p-2 text-sm font-medium rounded-xl! ${
                      isActiveTrack
                        ? "ring-2 ring-base-500 dark:ring-base-300"
                        : ""
                    }`}
                    variant={variantForStatus(progressRow.status)}
                    onClick={() => {
                      selectTrack(track.id);
                    }}
                  >
                    {trackIndex + 1}
                  </Button>
                );
              })}
            </section>
            <Button
              class="w-full"
              onClick={() => {
                trackNavExpanded.value = false;
              }}
            >
              Hide track grid
            </Button>
          </>
        )
        : (
          <>
            <div class="flex items-center gap-2">
              <Button
                disabled={prevDisabled}
                onClick={goPrev}
              >
                Previous
              </Button>
              <div class="flex-1 min-w-0">
                <div
                  class="grid grid-cols-20 py-1"
                >
                  {props.tracks.map((track) => {
                    const progressRow = props.progress.value.tracks.find(
                      (entry) => entry.trackId === track.id,
                    )!;
                    const isActiveTrack = props.activeId.value === track.id;
                    const variant = variantForStatus(progressRow.status);
                    const plateauVariant = variant ? ` ${variant}` : "";
                    return (
                      <Button
                        key={track.id}
                        type="button"
                        class={`h-12 w-3 p-0! ${
                          plateauVariant
                        } ${
                          isActiveTrack
                            ? "ring-2 ring-base-500 dark:ring-base-300"
                            : ""
                        }`}
                        onClick={() => {
                          selectTrack(track.id);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
              <Button
                disabled={nextDisabled}
                onClick={goNext}
              >
                Next
              </Button>
            </div>
            <Button
              class="w-full"
              onClick={() => {
                trackNavExpanded.value = true;
              }}
            >
              Show all tracks
            </Button>
          </>
        )}
    </div>
  );
}
