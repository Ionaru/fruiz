import type { ComponentChildren } from "preact";
import { useSignal, useSignalEffect } from "@preact/signals";
import { useSignalRef } from "@preact/signals/utils";
import {
  difficultyAccentRgb,
  NEUTRAL_ACCENT_RGB,
  type RgbTriplet,
} from "../components/quiz/glow.ts";
import type { DifficultyMode } from "../lib/types.ts";

const BAR_COUNT = 24;

export interface AudioVisualizerProps {
  /** Live AnalyserNode tap from the audio graph; null disables drawing. */
  analyserNode: AnalyserNode | null;
  /** When false, bars stay cleared (e.g. paused / idle). */
  active: boolean;
  /** When set, bars use the matching difficulty color; otherwise neutral. */
  accentDifficulty?: DifficultyMode;
  /** When false, canvases are skipped entirely (e.g. compact admin lists). */
  enabled: boolean;
  /** Center element flanked by the two bar canvases (usually the play/stop button). */
  children?: ComponentChildren;
}

interface CanvasState {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

function rgbToFillStyle(rgb: RgbTriplet): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.9)`;
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

function clearCanvas({ canvas, ctx }: CanvasState): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Direction "ltr" puts frequency bin 0 at the left edge; "rtl" puts it at the right edge,
 * so the two canvases form a mirrored pair with the strongest (low) bars closest to the
 * center child element.
 */
function drawBars(
  state: CanvasState,
  data: Uint8Array,
  fillStyle: string,
  direction: "ltr" | "rtl",
): void {
  const { canvas, ctx } = state;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const bars = Math.min(BAR_COUNT, data.length);
  const slotWidth = width / bars;
  const barWidth = Math.max(1, slotWidth * 0.6);
  const gap = slotWidth - barWidth;
  ctx.fillStyle = fillStyle;

  for (let i = 0; i < bars; i++) {
    const value = data[i] ?? 0;
    const barHeight = Math.max(1, (value / 255) * height);
    const slotIndex = direction === "ltr" ? i : bars - 1 - i;
    const x = slotIndex * slotWidth + gap / 2;
    const y = height - barHeight;
    ctx.fillRect(x, y, barWidth, barHeight);
  }
}

export function AudioVisualizer(props: Readonly<AudioVisualizerProps>) {
  const leftCanvasRef = useSignalRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useSignalRef<HTMLCanvasElement | null>(null);

  const analyserSig = useSignal<AnalyserNode | null>(props.analyserNode);
  const activeSig = useSignal(props.active);
  const accentSig = useSignal<DifficultyMode | undefined>(
    props.accentDifficulty,
  );
  analyserSig.value = props.analyserNode;
  activeSig.value = props.active;
  accentSig.value = props.accentDifficulty;

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

    const observer = new ResizeObserver(() => {
      resizeToDisplay(left);
      resizeToDisplay(right);
    });
    observer.observe(left);
    observer.observe(right);

    const analyser = analyserSig.value;
    if (!activeSig.value || !analyser) {
      clearCanvas(leftState);
      clearCanvas(rightState);
      return () => observer.disconnect();
    }

    const fillStyle = rgbToFillStyle(
      accentSig.value
        ? difficultyAccentRgb[accentSig.value]
        : NEUTRAL_ACCENT_RGB,
    );
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    let frameId: number | undefined;

    const renderFrame = () => {
      analyser.getByteFrequencyData(frequencyData);
      drawBars(rightState, frequencyData, fillStyle, "ltr");
      drawBars(leftState, frequencyData, fillStyle, "rtl");
      frameId = globalThis.requestAnimationFrame(renderFrame);
    };
    frameId = globalThis.requestAnimationFrame(renderFrame);

    return () => {
      if (frameId !== undefined) globalThis.cancelAnimationFrame(frameId);
      observer.disconnect();
      clearCanvas(leftState);
      clearCanvas(rightState);
    };
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
