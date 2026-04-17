import { useSignal, useSignalEffect } from "@preact/signals";
import { Button } from "../components/Button.tsx";
import { AudioTrackPlayer } from "../components/quiz/AudioTrackPlayer.tsx";
import { guessMatchesSuggestionPool } from "../lib/guess_match.ts";
import { isInteractiveFocus } from "../lib/keyboard.ts";
import { normalizeAnswer } from "../lib/normalize.ts";
import {
  buildDefaultProgress,
  canEndQuizWithSkippedRemaining,
  findNextTrackAfterSkip,
  findResumeActiveTrackId,
  isComplete,
  scoreFromProgress,
  STORAGE_KEY_PREFIX,
  tryMergeStoredProgress,
} from "../lib/quizProgress.ts";
import { encodeSlug, generateShortCode } from "../lib/slug.ts";
import type {
  QuizIdentity,
  QuizProgress,
  QuizProgressTrack,
  QuizTrackPayload,
} from "../lib/types.ts";
import AnswerInput from "./AnswerInput.tsx";
import { AudioPlayer } from "./AudioPlayer.tsx";
import { GuessResultModal } from "./GuessResultModal.tsx";
import QuizTrackNav from "./QuizTrackNav.tsx";
import { QuizResults } from "./QuizResults.tsx";
import { SettingsGate } from "./SettingsGate.tsx";

interface PopupResult {
  status: "correct" | "incorrect";
  newCollectionAdd: boolean;
  trackTitle: string;
}

interface Props {
  identity: QuizIdentity;
  initialReplayLimit: number | null;
  tracks: QuizTrackPayload[];
  titleSuggestions: string[];
  quizPath: string;
  loggedIn: boolean;
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
  const popupResult = useSignal<PopupResult | null>(null);

  const trackMap = Object.fromEntries(
    props.tracks.map((track) => [track.id, track]),
  );

  // --- helpers ---

  const updateProgress = (next: QuizProgress) => {
    next.score = scoreFromProgress(next);
    progress.value = next;
  };

  const updateTrack = (
    trackId: string,
    fn: (row: QuizProgressTrack) => QuizProgressTrack,
  ) => {
    updateProgress({
      ...progress.value,
      tracks: progress.value.tracks.map((row) =>
        row.trackId === trackId ? fn(row) : row
      ),
    });
  };

  const advanceToTrack = (trackId: string) => {
    activeId.value = trackId;
    const row = progress.value.tracks.find(
      (entry) => entry.trackId === trackId,
    );
    answerDraft.value = row?.selectedTitle ?? "";
  };

  // --- effects ---

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
          const resumedId = findResumeActiveTrackId(
            props.tracks,
            merged,
            activeId.value,
          );
          activeId.value = resumedId;
          const resumedRow = resumedId
            ? merged.tracks.find((entry) => entry.trackId === resumedId)
            : undefined;
          answerDraft.value = resumedRow?.selectedTitle ?? "";
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

  useSignalEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== " ") return;
      if (isInteractiveFocus()) return;
      event.preventDefault();
      const trackId = activeId.value;
      if (!trackId) return;
      const stop = document.getElementById(`listen-stop-${trackId}`);
      if (stop) {
        stop.click();
        return;
      }
      const play = document.getElementById(`listen-play-${trackId}`);
      if (play && !play.hasAttribute("disabled")) play.click();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  // --- actions ---

  const confirmSettings = () => {
    const value = Math.max(0, Math.floor(Number(draftLimit.value)) || 0);
    draftLimit.value = value;
    replayLimit.value = value;
    const url = new URL(globalThis.location.href);
    url.searchParams.set("limit", String(value));
    globalThis.history.replaceState(null, "", url.toString());
    settingsOpen.value = false;
  };

  const replayBlocked = (trackId: string): boolean => {
    const limit = replayLimit.value;
    if (limit <= 0) return false;
    const row = progress.value.tracks.find(
      (entry) => entry.trackId === trackId,
    );
    if (!row || row.status === "unavailable") return true;
    return row.replayCount >= limit;
  };

  const onPlayStart = (trackId: string) => {
    const row = progress.value.tracks.find(
      (entry) => entry.trackId === trackId,
    );
    if (!row || row.status === "unavailable") return;
    updateTrack(trackId, (current) => ({
      ...current,
      replayCount: current.replayCount + 1,
    }));
  };

  const onSkip = () => {
    const activeTrackId = activeId.value;
    if (!activeTrackId) return;
    const row = progress.value.tracks.find(
      (entry) => entry.trackId === activeTrackId,
    );
    if (!row || row.status === "correct" || row.status === "incorrect") return;

    const nextProgress: QuizProgress = {
      ...progress.value,
      tracks: progress.value.tracks.map((entry) =>
        entry.trackId === activeTrackId
          ? { ...entry, status: "skipped" as const, selectedTitle: null }
          : entry
      ),
    };
    nextProgress.score = scoreFromProgress(nextProgress);
    progress.value = nextProgress;
    if (isComplete(nextProgress)) showResults.value = true;
    advanceToTrack(
      findNextTrackAfterSkip(props.tracks, nextProgress, activeTrackId),
    );
  };

  const onSubmit = () => {
    const activeTrackId = activeId.value;
    if (!activeTrackId) return;
    const track = trackMap[activeTrackId];
    if (!track) return;
    const row = progress.value.tracks.find(
      (entry) => entry.trackId === activeTrackId,
    );
    if (
      !row || row.status === "correct" || row.status === "incorrect" ||
      row.status === "unavailable"
    ) return;

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
      replayCount: row.replayCount,
    }));

    popupResult.value = {
      status: isCorrect ? "correct" : "incorrect",
      newCollectionAdd: false,
      trackTitle: track.title,
    };

    if (isCorrect && props.loggedIn) {
      void fetch(`/api/collection/${activeTrackId}`, { method: "POST" })
        .then((response) => {
          if (response.status === 201 && popupResult.value !== null) {
            popupResult.value = {
              ...popupResult.value,
              newCollectionAdd: true,
            };
          }
        })
        .catch(() => {/* silent */});
    }

    answerDraft.value = "";
  };

  const onEndQuiz = () => {
    if (!canEndQuizWithSkippedRemaining(progress.value)) return;
    updateProgress({
      ...progress.value,
      tracks: progress.value.tracks.map((entry) =>
        entry.status === "skipped"
          ? { ...entry, status: "incorrect" as const, selectedTitle: null }
          : entry
      ),
    });
    showResults.value = true;
  };

  const onDismissPopup = () => {
    popupResult.value = null;
    if (activeId.value && !isComplete(progress.value)) {
      advanceToTrack(
        findNextTrackAfterSkip(props.tracks, progress.value, activeId.value),
      );
    } else {
      showResults.value = true;
    }
  };

  const copyBarePath = async () => {
    const url = new URL(globalThis.location.href);
    url.searchParams.keys().forEach((key) => url.searchParams.delete(key));
    try {
      await navigator.clipboard.writeText(url.toString());
    } catch {
      /* ignore */
    }
  };

  const playAgain = () => {
    const slug = encodeSlug(
      props.identity.difficulty,
      generateShortCode(),
    );
    const search = new URL(globalThis.location.href).search;
    globalThis.location.assign(
      `/quiz/${props.identity.categorySlug}/${slug}${search}`,
    );
  };

  // --- render ---

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
    return (
      <QuizResults
        tracks={props.tracks}
        progress={progress.value}
        loggedIn={props.loggedIn}
        onCopyLink={() => void copyBarePath()}
        onPlayAgain={playAgain}
      />
    );
  }

  const currentTrack = activeId.value ? trackMap[activeId.value] : undefined;
  const currentRow = activeId.value
    ? progress.value.tracks.find((entry) => entry.trackId === activeId.value)
    : undefined;
  const answerLocked = currentRow?.status === "correct" ||
    currentRow?.status === "incorrect" ||
    currentRow?.status === "unavailable";
  const currentClipNumber = currentTrack
    ? props.tracks.findIndex((track) => track.id === currentTrack.id) + 1
    : 0;
  const canSubmitGuess = guessMatchesSuggestionPool(
    answerDraft.value,
    props.titleSuggestions,
  );
  const showEndQuiz = canEndQuizWithSkippedRemaining(progress.value);

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
          {currentTrack.audioUrl
            ? (
              <AudioPlayer
                key={currentTrack.id}
                audioId={currentTrack.id}
                playbackGainDb={currentTrack.playbackGainDb}
                playStartSeconds={currentTrack.playStartSeconds}
                maxPlaySeconds={currentTrack.maxPlaySeconds}
                disabled={answerLocked || replayBlocked(currentTrack.id)}
                onPlayStart={() => onPlayStart(currentTrack.id)}
              />
            )
            : (
              <p class="text-sm opacity-80">
                This track is unavailable, so this round is auto-marked correct.
              </p>
            )}
          <AnswerInput
            instanceId={currentTrack.id}
            suggestions={props.titleSuggestions}
            value={answerDraft.value}
            disabled={answerLocked || !currentTrack.audioUrl}
            onValue={(nextValue) => {
              answerDraft.value = nextValue;
            }}
          />
          {showEndQuiz && (
            <p class="text-sm opacity-80">
              No clips left to discover—only skipped ones remain. End the quiz
              to count them as incorrect, or answer a skipped clip above.
            </p>
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
            {showEndQuiz && (
              <Button
                variant="danger"
                class="px-6"
                title="Skipped clips will be marked incorrect."
                onClick={onEndQuiz}
              >
                End quiz
              </Button>
            )}
          </div>
        </AudioTrackPlayer>
      )}

      {popupResult.value !== null && (
        <GuessResultModal
          status={popupResult.value.status}
          newCollectionAdd={popupResult.value.newCollectionAdd}
          trackTitle={popupResult.value.trackTitle}
          onDismiss={onDismissPopup}
        />
      )}
    </div>
  );
}
