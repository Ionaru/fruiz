import { useComputed, useSignal, useSignalEffect } from "@preact/signals";

import { Button } from "../components/Button.tsx";
import { AudioPlayer } from "./AudioPlayer.tsx";
import {
  parseTrackPlaybackFormFields,
  resolveMaxPlaySeconds,
  resolvePlayStartSeconds,
} from "../lib/quizPlayback.ts";
import { FaArrowsRotate } from "react-icons/fa6";
import { SpinningIcon } from "../components/ui/SpinningIcon.tsx";

interface ClipGainPreviewProps {
  audioId: string;
  /** Resolved fallback clip window (used when the form is missing/invalid). */
  playStartSeconds: number;
  maxPlaySeconds: number;
  playbackGainSourceSize?: number | null;
  playbackGainSourceMtimeMs?: number | null;
  /** Form whose start/max-length fields drive the live clip window. */
  syncPlaybackFromFormId: string;
  /** Endpoint measuring clip gain for `?start=&max=`, returning `{ clipPlaybackGainDb }`. */
  recalcUrl: string;
  /** Stored clip gain and the resolved window it was measured at. */
  initialClipGainDb: number | null;
  measuredStartSeconds: number | null;
  measuredMaxSeconds: number | null;
  /** Full-track gain; the preview falls back to it (as the quiz does) when no clip gain exists. */
  fullPlaybackGainDb: number | null;
}

/**
 * Admin-only wrapper around {@link AudioPlayer} for the track-edit preview. Keeps
 * the loudness-tuning concern (live clip window, "outdated" indicator, on-demand
 * recalculation) out of the core player, driving it only through `playbackGainDb`.
 */
export function ClipGainPreview(props: Readonly<ClipGainPreviewProps>) {
  // Mirror the quiz's `clip ?? full` fallback so the preview loudness matches
  // what the quiz will actually play for tracks with no clip gain yet.
  const gainSig = useSignal(
    props.initialClipGainDb ?? props.fullPlaybackGainDb,
  );
  const measuredBoundsSig = useSignal<{ start: number; max: number } | null>(
    props.measuredStartSeconds !== null && props.measuredMaxSeconds !== null
      ? { start: props.measuredStartSeconds, max: props.measuredMaxSeconds }
      : null,
  );
  const liveBoundsSig = useSignal<{ start: number; max: number } | null>(null);
  const pendingSig = useSignal(false);
  const errorSig = useSignal<string | null>(null);

  /** Track the form's resolved clip window so the "outdated" badge updates live. */
  useSignalEffect(() => {
    const readBounds = () => {
      let start = props.playStartSeconds;
      let max = props.maxPlaySeconds;
      const root = document.getElementById(props.syncPlaybackFromFormId);
      if (root instanceof HTMLFormElement) {
        const parsed = parseTrackPlaybackFormFields(new FormData(root));
        if (parsed.ok) {
          start = resolvePlayStartSeconds(parsed.playStartSeconds);
          max = resolveMaxPlaySeconds(parsed.maxPlaySeconds);
        }
      }
      liveBoundsSig.value = { start, max };
    };
    readBounds();
    const root = document.getElementById(props.syncPlaybackFromFormId);
    if (!(root instanceof HTMLFormElement)) return;
    root.addEventListener("input", readBounds);
    return () => root.removeEventListener("input", readBounds);
  });

  const outdatedSig = useComputed(() => {
    const live = liveBoundsSig.value;
    if (!live) return false;
    const measured = measuredBoundsSig.value;
    if (!measured) return true;
    return live.start !== measured.start || live.max !== measured.max;
  });

  const recalculate = async () => {
    const live = liveBoundsSig.value;
    if (!live) return;
    pendingSig.value = true;
    errorSig.value = null;
    try {
      const res = await fetch(
        `${props.recalcUrl}?start=${encodeURIComponent(live.start)}&max=${
          encodeURIComponent(live.max)
        }`,
      );
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = await res.json() as { clipPlaybackGainDb: number | null };
      gainSig.value = body.clipPlaybackGainDb;
      measuredBoundsSig.value = { start: live.start, max: live.max };
    } catch {
      errorSig.value =
        "Couldn't measure clip loudness — the server's audio analysis (ffmpeg) may be unavailable.";
    } finally {
      pendingSig.value = false;
    }
  };

  return (
    <div class="flex flex-col gap-2 items-center">
      <AudioPlayer
        audioId={props.audioId}
        playbackGainDb={gainSig.value}
        playStartSeconds={props.playStartSeconds}
        maxPlaySeconds={props.maxPlaySeconds}
        playbackGainSourceSize={props.playbackGainSourceSize}
        playbackGainSourceMtimeMs={props.playbackGainSourceMtimeMs}
        syncPlaybackFromFormId={props.syncPlaybackFromFormId}
      />
      {(outdatedSig.value || errorSig.value) && (
        <div class="flex flex-col gap-1 items-center">
          {outdatedSig.value && (
            <p class="text-sm text-amber-700 dark:text-amber-300">
              Preview loudness is outdated for the current clip window.
            </p>
          )}
          {errorSig.value && (
            <p class="text-sm text-red-700 dark:text-red-300" role="alert">
              {errorSig.value}
            </p>
          )}
          <Button
            class="px-4 py-2"
            variant="info"
            type="button"
            disabled={pendingSig.value}
            onClick={recalculate}
          >
            {pendingSig.value ? <SpinningIcon /> : <FaArrowsRotate />}
            <span class="ml-2">Recalculate loudness</span>
          </Button>
        </div>
      )}
    </div>
  );
}
