import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { Button } from "../components/Button.tsx";
import { AudioTrackPlayer } from "../components/quiz/AudioTrackPlayer.tsx";
import { normalizeAnswer } from "../lib/normalize.ts";
import { encodeSlug, generateShortSeed } from "../lib/slug.ts";
import type {
  QuizIdentity,
  QuizProgress,
  QuizTrackPayload,
} from "../lib/types.ts";
import AnswerInput from "./AnswerInput.tsx";
import { AudioPlayer } from "./AudioPlayer.tsx";
import { SettingsGate } from "./SettingsGate.tsx";

const STORAGE_KEY_PREFIX = "fruiz-quiz:";

function buildDefaultProgress(
  trackList: QuizTrackPayload[],
  quizPath: string,
): QuizProgress {
  return {
    quizPath,
    score: 0,
    tracks: trackList.map((track) => ({
      trackId: track.id,
      status: "unanswered",
      selectedTitle: null,
      replayCount: 0,
    })),
  };
}

function isComplete(progress: QuizProgress): boolean {
  return progress.tracks.every(
    (entry) => entry.status !== "unanswered" && entry.status !== "skipped",
  );
}

function scoreFromProgress(progress: QuizProgress): number {
  return progress.tracks.filter((entry) => entry.status === "correct").length;
}

interface Props {
  identity: QuizIdentity;
  initialReplayLimit: number | null;
  tracks: QuizTrackPayload[];
  titleSuggestions: string[];
  quizPath: string;
}

export default function QuizController(props: Readonly<Props>) {
  const settingsOpen = useSignal(props.initialReplayLimit === null);
  const replayLimit = useSignal(props.initialReplayLimit ?? 0);
  const draftLimit = useSignal(props.initialReplayLimit ?? 0);

  const activeId = useSignal<string | null>(props.tracks[0]?.id ?? null);
  const answerDraft = useSignal("");
  const progress = useSignal<QuizProgress>(
    buildDefaultProgress(props.tracks, props.quizPath),
  );
  const showResults = useSignal(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PREFIX + props.quizPath);
      if (!raw) return;
      const parsed = JSON.parse(raw) as QuizProgress;
      if (parsed.quizPath !== props.quizPath) return;
      if (!Array.isArray(parsed.tracks)) return;
      const validIds = new Set(props.tracks.map((track) => track.id));
      if (parsed.tracks.length !== props.tracks.length) return;
      if (
        !parsed.tracks.every((progressRow) => validIds.has(progressRow.trackId))
      ) {
        return;
      }
      const merged: QuizProgress = {
        ...parsed,
        score: scoreFromProgress(parsed),
      };
      progress.value = merged;
      if (isComplete(merged)) showResults.value = true;
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_PREFIX + props.quizPath,
        JSON.stringify(progress.value),
      );
    } catch {
      /* ignore */
    }
  }, [progress.value]);

  const confirmSettings = () => {
    const replayLimitValue = Math.max(
      0,
      Math.floor(Number(draftLimit.value)) || 0,
    );
    draftLimit.value = replayLimitValue;
    replayLimit.value = replayLimitValue;
    const url = new URL(globalThis.location.href);
    url.searchParams.set("limit", String(replayLimitValue));
    globalThis.history.replaceState(null, "", url.toString());
    settingsOpen.value = false;
  };

  const trackMap = Object.fromEntries(
    props.tracks.map((track) => [track.id, track]),
  );

  const updateTrack = (
    trackId: string,
    fn: (row: QuizProgress["tracks"][0]) => QuizProgress["tracks"][0],
  ) => {
    const next: QuizProgress = {
      ...progress.value,
      tracks: progress.value.tracks.map((row) =>
        row.trackId === trackId ? fn(row) : row
      ),
    };
    next.score = scoreFromProgress(next);
    progress.value = next;
    if (isComplete(next)) showResults.value = true;
  };

  const replayBlocked = (trackId: string) => {
    const limit = replayLimit.value;
    if (limit <= 0) return false;
    const progressRow = progress.value.tracks.find(
      (entry) => entry.trackId === trackId,
    );
    if (!progressRow) return true;
    return progressRow.replayCount >= limit;
  };

  const onPlayStart = (trackId: string) => {
    updateTrack(trackId, (row) => ({
      ...row,
      replayCount: row.replayCount + 1,
    }));
  };

  const onSkip = () => {
    const activeTrackId = activeId.value;
    if (!activeTrackId) return;
    updateTrack(activeTrackId, (row) => {
      if (row.status === "correct" || row.status === "incorrect") return row;
      return { ...row, status: "skipped", selectedTitle: null };
    });
  };

  const onSubmit = () => {
    const activeTrackId = activeId.value;
    if (!activeTrackId) return;
    const track = trackMap[activeTrackId];
    if (!track) return;
    const progressRow = progress.value.tracks.find(
      (entry) => entry.trackId === activeTrackId,
    );
    if (
      !progressRow || progressRow.status === "correct" ||
      progressRow.status === "incorrect"
    ) {
      return;
    }

    const isCorrect =
      normalizeAnswer(answerDraft.value) === normalizeAnswer(track.title);
    updateTrack(activeTrackId, () => ({
      trackId: activeTrackId,
      status: isCorrect ? "correct" : "incorrect",
      selectedTitle: answerDraft.value,
      replayCount: progressRow.replayCount,
    }));
    answerDraft.value = "";
  };

  const variantForStatus = (
    status: QuizProgress["tracks"][0]["status"],
  ): "success" | "danger" | "warning" | undefined => {
    switch (status) {
      case "correct":
        return "success";
      case "incorrect":
        return "danger";
      case "skipped":
        return "warning";
      default:
        return undefined;
    }
  };

  const copyBarePath = async () => {
    try {
      await navigator.clipboard.writeText(props.quizPath);
    } catch {
      /* ignore */
    }
  };

  const playAgain = () => {
    const seed = generateShortSeed();
    const slug = encodeSlug(props.identity.difficulty, seed);
    const search = new URL(globalThis.location.href).search;
    globalThis.location.assign(
      `/quiz/${props.identity.categorySlug}/${slug}${search}`,
    );
  };

  if (settingsOpen.value) {
    return (
      <SettingsGate
        draftLimit={draftLimit.value}
        onDraftLimitInput={(rawValue) => {
          draftLimit.value = Number.isFinite(rawValue) && rawValue >= 0
            ? Math.floor(rawValue)
            : 0;
        }}
        onContinue={confirmSettings}
      />
    );
  }

  if (showResults.value) {
    const total = props.tracks.length;
    const correct = scoreFromProgress(progress.value);
    return (
      <div class="space-y-6">
        <div class="plateau rounded-2xl p-6 space-y-2 text-center">
          <p class="text-sm opacity-80">Results</p>
          <p class="text-4xl font-bold tabular-nums">
            {correct} / {total}
          </p>
        </div>
        <ul class="space-y-2">
          {props.tracks.map((track) => {
            const progressRow = progress.value.tracks.find(
              (entry) => entry.trackId === track.id,
            )!;
            return (
              <li
                key={track.id}
                class="plateau rounded-xl px-4 py-3 flex justify-between gap-2 text-sm"
              >
                <span class="font-medium truncate">{track.title}</span>
                <span class="shrink-0 capitalize opacity-90">
                  {progressRow.status}
                </span>
              </li>
            );
          })}
        </ul>
        <div class="flex flex-col sm:flex-row gap-3">
          <Button
            class="flex-1"
            variant="info"
            onClick={() => void copyBarePath()}
          >
            Copy quiz link
          </Button>
          <Button class="flex-1" variant="success" onClick={playAgain}>
            Play again
          </Button>
        </div>
      </div>
    );
  }

  const currentTrack = activeId.value ? trackMap[activeId.value] : undefined;
  const currentRow = activeId.value
    ? progress.value.tracks.find(
      (entry) => entry.trackId === activeId.value,
    )
    : undefined;
  const answerLocked = currentRow?.status === "correct" ||
    currentRow?.status === "incorrect";

  const currentClipNumber = currentTrack
    ? props.tracks.findIndex((track) => track.id === currentTrack.id) + 1
    : 0;

  return (
    <div class="space-y-6">
      <div class="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {props.tracks.map((track, trackIndex) => {
          const progressRow = progress.value.tracks.find(
            (entry) => entry.trackId === track.id,
          )!;
          const isActiveTrack = activeId.value === track.id;
          return (
            <Button
              key={track.id}
              class={`min-w-0 aspect-square p-2 text-sm font-medium rounded-xl! ${
                isActiveTrack ? "ring-2 ring-base-500 dark:ring-base-300" : ""
              }`}
              variant={variantForStatus(progressRow.status)}
              onClick={() => {
                activeId.value = track.id;
                answerDraft.value = progressRow.selectedTitle ?? "";
              }}
            >
              {trackIndex + 1}
            </Button>
          );
        })}
      </div>

      {currentTrack && currentRow && (
        <AudioTrackPlayer
          clipNumber={currentClipNumber}
          clipTotal={props.tracks.length}
        >
          <AudioPlayer
            key={currentTrack.id}
            audioId={currentTrack.id}
            disabled={answerLocked || replayBlocked(currentTrack.id)}
            onPlayStart={() => onPlayStart(currentTrack.id)}
          />
          <AnswerInput
            instanceId={currentTrack.id}
            suggestions={props.titleSuggestions}
            value={answerDraft.value}
            disabled={answerLocked}
            onValue={(nextValue) => {
              answerDraft.value = nextValue;
            }}
          />
          <div class="flex flex-wrap gap-3">
            <Button
              variant="success"
              class="px-6"
              disabled={answerLocked || answerDraft.value.trim() === ""}
              onClick={onSubmit}
            >
              Submit
            </Button>
            <Button
              variant="warning"
              class="px-6"
              disabled={answerLocked}
              onClick={onSkip}
            >
              Skip
            </Button>
          </div>
        </AudioTrackPlayer>
      )}
    </div>
  );
}
