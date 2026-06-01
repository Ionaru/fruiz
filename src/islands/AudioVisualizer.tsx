import type { ComponentChildren } from "preact";
import { useSignal, useSignalEffect } from "@preact/signals";
import { useSignalRef } from "@preact/signals/utils";
import {
  computeLogBandEdges,
  computeTiltWeights,
  fillSpectrumBars,
  resolveMaxBin,
  SPECTRUM_MIN_BIN,
  SPECTRUM_TILT,
} from "../lib/audioSpectrum.ts";

const BAR_COUNT = 24;
/** Bars never shrink below this fraction of canvas height, so a thin resting
 * line stays visible when idle (and bars never fully disappear while playing). */
const RESTING_FRACTION = 0.08;
/** Duration of the ease-back-to-resting animation when playback stops. */
const COLLAPSE_MS = 300;
/** All-zero magnitudes render as the resting line (floored to RESTING_FRACTION). */
const RESTING_MAGNITUDES = new Float32Array(BAR_COUNT);

export interface AudioVisualizerProps {
  /** Live AnalyserNode tap from the audio graph; null disables drawing. */
  analyserNode: AnalyserNode | null;
  /** When false, bars rest on the centerline (e.g. paused / idle). */
  active: boolean;
  /** When false, canvases are skipped entirely (e.g. compact admin lists). */
  enabled: boolean;
  /** Center element flanked by the two bar canvases (usually the play/stop button). */
  children?: ComponentChildren;
}

interface CanvasState {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

function resizeToDisplay(canvas: HTMLCanvasElement): void {
  const dpr = globalThis.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  if (cssWidth === 0 || cssHeight === 0) return;
  const targetWidth = Math.round(cssWidth * dpr);
  const targetHeight = Math.round(cssHeight * dpr);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
}

const easeOutCubic = (progress: number): number =>
  1 - Math.pow(1 - progress, 3);

/**
 * Draws one mirrored channel of bars. Each bar is centered on the vertical
 * midline and grows symmetrically up and down, so rising magnitudes expand in
 * both directions instead of only upward. Magnitudes are normalized (0..1) and
 * floored to {@link RESTING_FRACTION} so the bars always rest on the centerline.
 *
 * Direction "ltr" puts frequency bin 0 at the left edge; "rtl" puts it at the
 * right edge, so the two canvases form a mirrored pair with the strongest (low)
 * bars closest to the center child element.
 */
function drawBars(
  state: CanvasState,
  magnitudes: ArrayLike<number>,
  fill: string,
  direction: "ltr" | "rtl",
): void {
  const { canvas, ctx } = state;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const bars = Math.min(BAR_COUNT, magnitudes.length);
  const slotWidth = width / bars;
  const barWidth = Math.max(1, slotWidth * 0.6);
  const gap = slotWidth - barWidth;
  ctx.fillStyle = fill;

  for (let i = 0; i < bars; i++) {
    const magnitude = magnitudes[i] ?? 0;
    const barHeight = Math.max(RESTING_FRACTION, magnitude) * height;
    const slotIndex = direction === "ltr" ? i : bars - 1 - i;
    const x = slotIndex * slotWidth + gap / 2;
    const y = (height - barHeight) / 2;
    ctx.fillRect(x, y, barWidth, barHeight);
  }
}

export function AudioVisualizer(props: Readonly<AudioVisualizerProps>) {
  const leftCanvasRef = useSignalRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useSignalRef<HTMLCanvasElement | null>(null);

  const analyserSig = useSignal<AnalyserNode | null>(props.analyserNode);
  const activeSig = useSignal(props.active);
  analyserSig.value = props.analyserNode;
  activeSig.value = props.active;

  /**
   * Last per-bar magnitudes captured during playback. Written every frame and
   * read with `.peek()` so this effect never subscribes to it — per-frame
   * writes must not re-trigger the effect. Used to ease bars back to the resting
   * line when playback stops.
   */
  const lastNormalized = useSignal<Float32Array | null>(null);

  useSignalEffect(() => {
    if (!props.enabled) return;
    const left = leftCanvasRef.value;
    const right = rightCanvasRef.value;
    if (!left || !right) return;
    const leftCtx = left.getContext("2d");
    const rightCtx = right.getContext("2d");
    if (!leftCtx || !rightCtx) return;

    const leftState: CanvasState = { canvas: left, ctx: leftCtx };
    const rightState: CanvasState = { canvas: right, ctx: rightCtx };
    resizeToDisplay(left);
    resizeToDisplay(right);

    // Muted neutral that reads on both themes. `||` (not `??`) so an unresolved
    // custom property — getPropertyValue returns "" — also falls back, instead
    // of assigning "" to fillStyle (a silent no-op that leaves bars black).
    const fill = getComputedStyle(left).getPropertyValue("--color-base-400") ||
      "#9A9A9E";

    const drawPair = (magnitudes: ArrayLike<number>) => {
      drawBars(rightState, magnitudes, fill, "ltr");
      drawBars(leftState, magnitudes, fill, "rtl");
    };
    const drawResting = () => drawPair(RESTING_MAGNITUDES);

    let frameId: number | undefined;
    /** True while a rAF loop (live or collapse) owns the canvas; static states redraw on resize. */
    let isAnimating = false;

    const observer = new ResizeObserver(() => {
      resizeToDisplay(left);
      resizeToDisplay(right);
      if (!isAnimating) drawResting();
    });
    observer.observe(left);
    observer.observe(right);

    const cleanup = () => {
      if (frameId !== undefined) globalThis.cancelAnimationFrame(frameId);
      observer.disconnect();
    };

    const analyser = analyserSig.value;

    // Playing: live frequency data drives the bars (unchanged behavior).
    if (activeSig.value && analyser) {
      isAnimating = true;
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      const magnitudes = new Float32Array(BAR_COUNT);
      // Precompute the log-spaced band edges and treble tilt once per effect so
      // the per-frame path only averages bins (see lib/audioSpectrum.ts for why
      // linear bins are remapped). Raw bins would pin the low bars and flatten
      // the high bars on every track.
      const bandEdges = computeLogBandEdges(
        BAR_COUNT,
        SPECTRUM_MIN_BIN,
        resolveMaxBin(frequencyData.length),
      );
      const tiltWeights = computeTiltWeights(BAR_COUNT, SPECTRUM_TILT);
      // Expose the live buffer for the stop-collapse tween. The reference is
      // stable: renderFrame mutates it in place, and cleanup cancels the loop
      // before the idle branch reads it via peek(), so no per-frame copy is
      // needed (a slice() here would allocate ~60 arrays/sec for one reader).
      lastNormalized.value = magnitudes;

      // Flush the analyser's smoothed buffer, which otherwise still holds the
      // frame from where the previous clip stopped. Without this, smoothing
      // blends that stale frame into the first frames, so a restart visibly
      // jumps to the old stop point before settling. A throwaway read with
      // smoothing disabled overwrites the buffer with the current audio.
      const smoothing = analyser.smoothingTimeConstant;
      analyser.smoothingTimeConstant = 0;
      analyser.getByteFrequencyData(frequencyData);
      analyser.smoothingTimeConstant = smoothing;

      const renderFrame = () => {
        analyser.getByteFrequencyData(frequencyData);
        fillSpectrumBars(magnitudes, frequencyData, bandEdges, tiltWeights);
        drawPair(magnitudes);
        frameId = globalThis.requestAnimationFrame(renderFrame);
      };
      frameId = globalThis.requestAnimationFrame(renderFrame);
      return cleanup;
    }

    // Idle: ease the last playing frame back down to the resting line, then hold.
    const snapshot = lastNormalized.peek();
    lastNormalized.value = null;
    if (!snapshot) {
      drawResting();
      return cleanup;
    }

    isAnimating = true;
    const tween = new Float32Array(snapshot.length);
    let collapseStart: number | undefined;
    const collapseFrame = (now: number) => {
      if (collapseStart === undefined) collapseStart = now;
      const progress = Math.min(1, (now - collapseStart) / COLLAPSE_MS);
      const remaining = 1 - easeOutCubic(progress);
      for (let i = 0; i < tween.length; i++) {
        tween[i] = (snapshot[i] ?? 0) * remaining;
      }
      drawPair(tween);
      if (progress < 1) {
        frameId = globalThis.requestAnimationFrame(collapseFrame);
      } else {
        isAnimating = false;
        drawResting();
      }
    };
    frameId = globalThis.requestAnimationFrame(collapseFrame);
    return cleanup;
  });

  if (!props.enabled) return <>{props.children}</>;

  return (
    <>
      <canvas
        ref={leftCanvasRef}
        class="h-12 w-24 sm:w-32 shrink min-w-0"
        aria-hidden="true"
      />
      {props.children}
      <canvas
        ref={rightCanvasRef}
        class="h-12 w-24 sm:w-32 shrink min-w-0"
        aria-hidden="true"
      />
    </>
  );
}
