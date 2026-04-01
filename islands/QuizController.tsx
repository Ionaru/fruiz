import { useSignal, useSignalEffect } from "@preact/signals";
import { Button } from "../components/Button.tsx";
import { AudioTrackPlayer } from "../components/quiz/AudioTrackPlayer.tsx";
import { guessMatchesSuggestionPool } from "../lib/guess_match.ts";
import { normalizeAnswer } from "../lib/normalize.ts";
import { encodeSlug, generateShortSeed } from "../lib/slug.ts";
import type {
  QuizIdentity,
  QuizProgress,
  QuizTrackPayload,
} from "../lib/types.ts";
import AnswerInput from "./AnswerInput.tsx";
import { AudioPlayer } from "./AudioPlayer.tsx";
import QuizTrackNav from "./QuizTrackNav.tsx";
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

/**
 * After the current track is marked skipped, pick where focus should go:
 * circular scan from the next list index, preferring `unanswered` while any
 * exist globally; otherwise the first `skipped` track in that scan.
 */
function findNextTrackAfterSkip(
  trackList: QuizTrackPayload[],
  progressAfterSkip: QuizProgress,
  currentTrackId: string,
): string {
  const n = trackList.length;
  if (n === 0) return currentTrackId;
  const currentIndex = trackList.findIndex((t) => t.id === currentTrackId);
  if (currentIndex < 0) return currentTrackId;

  const hasAnyUnanswered = progressAfterSkip.tracks.some(
    (row) => row.status === "unanswered",
  );
  const targetStatus: "unanswered" | "skipped" = hasAnyUnanswered
    ? "unanswered"
    : "skipped";

  for (let offset = 1; offset <= n; offset++) {
    const id = trackList[(currentIndex + offset) % n].id;
    const status = progressAfterSkip.tracks.find((row) => row.trackId === id)
      ?.status;
    if (status === targetStatus) return id;
  }
  return currentTrackId;
}

/** Returns merged progress from `localStorage`, or `null` if missing or invalid. */
function tryMergeStoredProgress(
  raw: string | null,
  quizPath: string,
  tracks: QuizTrackPayload[],
): QuizProgress | null {
  if (!raw) return null;
  let parsed: QuizProgress;
  try {
    parsed = JSON.parse(raw) as QuizProgress;
  } catch {
    return null;
  }
  if (parsed.quizPath !== quizPath || !Array.isArray(parsed.tracks)) {
    return null;
  }
  const validIds = new Set(tracks.map((track) => track.id));
  if (
    parsed.tracks.length !== tracks.length ||
    !parsed.tracks.every((row) => validIds.has(row.trackId))
  ) {
    return null;
  }
  return { ...parsed, score: scoreFromProgress(parsed) };
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
  const didHydrateStorage = useSignal(false);

  useSignalEffect(() => {
    if (!didHydrateStorage.value) {
      try {
        const merged = tryMergeStoredProgress(
          localStorage.getItem(STORAGE_KEY_PREFIX + props.quizPath),
          props.quizPath,
          props.tracks,
        );
        if (merged) {
          progress.value = merged;
          if (isComplete(merged)) showResults.value = true;
        }
      } catch {
        /* ignore */
      } finally {
        didHydrateStorage.value = true;
      }
    }
    try {
      localStorage.setItem(
        STORAGE_KEY_PREFIX + props.quizPath,
        JSON.stringify(progress.value),
      );
    } catch {
      /* ignore */
    }
  });

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
    const progressRow = progress.value.tracks.find(
      (entry) => entry.trackId === activeTrackId,
    );
    if (
      !progressRow || progressRow.status === "correct" ||
      progressRow.status === "incorrect"
    ) {
      return;
    }
    const nextProgress: QuizProgress = {
      ...progress.value,
      tracks: progress.value.tracks.map((row) =>
        row.trackId === activeTrackId
          ? { ...row, status: "skipped" as const, selectedTitle: null }
          : row
      ),
    };
    nextProgress.score = scoreFromProgress(nextProgress);
    const nextId = findNextTrackAfterSkip(
      props.tracks,
      nextProgress,
      activeTrackId,
    );
    progress.value = nextProgress;
    if (isComplete(nextProgress)) showResults.value = true;
    activeId.value = nextId;
    const nextRow = nextProgress.tracks.find(
      (entry) => entry.trackId === nextId,
    );
    answerDraft.value = nextRow?.selectedTitle ?? "";
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

    if (
      !guessMatchesSuggestionPool(answerDraft.value, props.titleSuggestions)
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

  const canSubmitGuess = guessMatchesSuggestionPool(
    answerDraft.value,
    props.titleSuggestions,
  );
  const suggestionPoolHintId = `answer-pool-hint-${activeId.value ?? "none"}`;
  const showPoolHint = !answerLocked && answerDraft.value.trim() !== "" &&
    !canSubmitGuess;

  let submitTitle: string | undefined;
  if (!answerLocked && !canSubmitGuess) {
    submitTitle = answerDraft.value.trim() === ""
      ? "Type a title that matches the suggestions list."
      : "Adjust your answer to match a suggested title (same spelling rules as scoring).";
  }

  return (
    <div class="space-y-6">
      <QuizTrackNav
        tracks={props.tracks}
        activeId={activeId}
        answerDraft={answerDraft}
        progress={progress}
      />

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
            ariaDescribedBy={showPoolHint ? suggestionPoolHintId : undefined}
            onValue={(nextValue) => {
              answerDraft.value = nextValue;
            }}
          />
          {showPoolHint && (
            <output
              id={suggestionPoolHintId}
              class="text-xs opacity-80 block"
            >
              Match a suggested title to enable Submit.
            </output>
          )}
          <div class="flex flex-wrap gap-3">
            <Button
              variant="success"
              class="px-6"
              title={submitTitle}
              disabled={answerLocked || !canSubmitGuess}
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
