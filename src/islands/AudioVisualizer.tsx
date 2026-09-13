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
/**
 * The inline strip is a fraction of the flanking pair's width, so it gets
 * proportionally fewer bands — even 12 bars in the 40px the collection row can
 * spare on a phone would render as slivers with no readable gap between them.
 */
const INLINE_BAR_COUNT = 8;
/** Bars never shrink below this fraction of canvas height, so a thin resting
 * line stays visible when idle (and bars never fully disappear while playing). */
const RESTING_FRACTION = 0.08;
/** Duration of the ease-back-to-resting animation when playback stops. */
const COLLAPSE_MS = 300;

/** How the bars are arranged around (or beside) the player's control. */
export type VisualizerLayout = "flanking" | "inline";

export interface AudioVisualizerProps {
  /** Live AnalyserNode tap from the audio graph; null disables drawing. */
  analyserNode: AnalyserNode | null;
  /** When false, bars rest on the centerline (e.g. paused / idle). */
  active: boolean;
  /** When false, canvases are skipped entirely (e.g. compact admin lists). */
  enabled: boolean;
  /**
   * `"flanking"` (the default) mirrors two canvases around {@link children}.
   * `"inline"` draws a single short strip and renders no children — the
   * collection row sits it beside its own controls, not around them.
   */
  layout?: VisualizerLayout;
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
 * Draws one mirrored channel of bars: each grows symmetrically about the
 * vertical midline, floored to {@link RESTING_FRACTION} so they always rest on
 * the centerline. "ltr" puts bin 0 at the left edge, "rtl" at the right, so the
 * two canvases mirror with the strongest (low) bars nearest the centre child.
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

  const bars = magnitudes.length;
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
  const isInline = props.layout === "inline";
  const barCount = isInline ? INLINE_BAR_COUNT : BAR_COUNT;
  /** All-zero magnitudes render as the resting line (floored to RESTING_FRACTION). */
  const restingMagnitudes = new Float32Array(barCount);
  const leftCanvasRef = useSignalRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useSignalRef<HTMLCanvasElement | null>(null);

  const analyserSig = useSignal<AnalyserNode | null>(props.analyserNode);
  const activeSig = useSignal(props.active);
  analyserSig.value = props.analyserNode;
  activeSig.value = props.active;

  /**
   * Last per-bar magnitudes captured during playback, used to ease the bars back
   * to the resting line when it stops. Read with `.peek()` so the per-frame
   * writes never re-trigger the effect.
   */
  const lastNormalized = useSignal<Float32Array | null>(null);

  useSignalEffect(() => {
    if (!props.enabled) return;
    // The inline layout draws the single right-hand canvas only; the flanking
    // layout needs both before it can mirror them.
    const right = rightCanvasRef.value;
    if (!right) return;
    const left = isInline ? null : leftCanvasRef.value;
    if (!isInline && !left) return;
    const rightCtx = right.getContext("2d");
    if (!rightCtx) return;
    const leftCtx = left ? left.getContext("2d") : null;
    if (left && !leftCtx) return;

    const targets: { state: CanvasState; direction: "ltr" | "rtl" }[] = [
      { state: { canvas: right, ctx: rightCtx }, direction: "ltr" },
    ];
    if (left && leftCtx) {
      targets.push({ state: { canvas: left, ctx: leftCtx }, direction: "rtl" });
    }
    for (const target of targets) resizeToDisplay(target.state.canvas);

    // Muted neutral that reads on both themes. `||` (not `??`) so an unresolved
    // custom property — getPropertyValue returns "" — also falls back, instead
    // of assigning "" to fillStyle (a silent no-op that leaves bars black).
    const fill = getComputedStyle(right).getPropertyValue("--color-base-400") ||
      "#9A9A9E";

    const drawPair = (magnitudes: ArrayLike<number>) => {
      for (const target of targets) {
        drawBars(target.state, magnitudes, fill, target.direction);
      }
    };
    const drawResting = () => drawPair(restingMagnitudes);

    let frameId: number | undefined;
    /** True while a rAF loop (live or collapse) owns the canvas; static states redraw on resize. */
    let isAnimating = false;

    const observer = new ResizeObserver(() => {
      for (const target of targets) resizeToDisplay(target.state.canvas);
      if (!isAnimating) drawResting();
    });
    for (const target of targets) observer.observe(target.state.canvas);

    const cleanup = () => {
      if (frameId !== undefined) globalThis.cancelAnimationFrame(frameId);
      observer.disconnect();
    };

    const analyser = analyserSig.value;

    if (activeSig.value && analyser) {
      isAnimating = true;
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      const magnitudes = new Float32Array(barCount);
      // Precompute the log-spaced band edges and treble tilt once per effect so
      // the per-frame path only averages bins (see lib/audioSpectrum.ts for why
      // linear bins are remapped). Raw bins would pin the low bars and flatten
      // the high bars on every track.
      const bandEdges = computeLogBandEdges(
        barCount,
        SPECTRUM_MIN_BIN,
        resolveMaxBin(frequencyData.length),
      );
      const tiltWeights = computeTiltWeights(barCount, SPECTRUM_TILT);
      // Expose the live buffer for the stop-collapse tween. The reference is
      // stable: renderFrame mutates it in place, and cleanup cancels the loop
      // before the idle branch reads it via peek(), so no per-frame copy is
      // needed (a slice() here would allocate ~60 arrays/sec for one reader).
      lastNormalized.value = magnitudes;

      // Flush the analyser's smoothed buffer, which still holds the frame the
      // previous clip stopped on: smoothing would blend it into the first
      // frames and a restart would visibly jump to the old stop point. A
      // throwaway read with smoothing off overwrites it with the current audio.
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

  if (isInline) {
    return (
      <canvas
        ref={rightCanvasRef}
        class="h-9 w-10 shrink-0 xs:w-14"
        aria-hidden="true"
      />
    );
  }

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
