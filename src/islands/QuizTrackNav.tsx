import type { Signal } from "@preact/signals";
import { useSignal, useSignalEffect } from "@preact/signals";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa6";
import { Button } from "../components/Button.tsx";
import { isInteractiveFocus } from "../lib/keyboard.ts";
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

  useSignalEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (isInteractiveFocus()) return;
      event.preventDefault();
      if (event.key === "ArrowLeft") goPrev();
      else goNext();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  const total = props.tracks.length;
  const idx = activeIndex();
  const prevDisabled = idx <= 0;
  const nextDisabled = idx < 0 || idx >= total - 1;

  return (
    <div class="space-y-2">
      {trackNavExpanded.value
        ? (
          <>
            <section class="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {props.tracks.map((track, trackIndex) => {
                const progressRow = props.progress.value.tracks.find(
                  (entry) => entry.trackId === track.id,
                );
                if (!progressRow) {
                  throw new Error(`Missing progress for track ${track.id}`);
                }
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
            <div class="grid grid-cols-[auto_1fr_auto] items-center gap-2">
              <Button
                disabled={prevDisabled}
                onClick={goPrev}
              >
                <FaArrowLeft />
              </Button>
              <div class="flex-1 grid grid-cols-20">
                {props.tracks.map((track) => {
                  const progressRow = props.progress.value.tracks.find(
                    (entry) => entry.trackId === track.id,
                  );
                  if (!progressRow) {
                    throw new Error(`Missing progress for track ${track.id}`);
                  }
                  const isActiveTrack = props.activeId.value === track.id;
                  const variant = variantForStatus(progressRow.status);
                  const plateauVariant = variant ? ` ${variant}` : "";
                  return (
                    <Button
                      key={track.id}
                      type="button"
                      class={`h-12 p-0! m-0.25 xs:m-0.5 ${plateauVariant} ${
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
              <Button
                disabled={nextDisabled}
                onClick={goNext}
              >
                <FaArrowRight />
              </Button>
            </div>
            <Button
              class="w-full px-3 py-2 text-sm"
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
