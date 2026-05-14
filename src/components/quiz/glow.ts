import type { DifficultyMode } from "../../lib/types.ts";

const difficultyColor: Record<DifficultyMode, string> = {
  easy: "glow-green",
  mixed: "glow-yellow",
  hard: "glow-red",
};

export const difficultyGlowClass: Record<DifficultyMode, string> = {
  easy: `glow glow-strong ${difficultyColor.easy}`,
  mixed: `glow glow-strong ${difficultyColor.mixed}`,
  hard: `glow glow-strong ${difficultyColor.hard}`,
};

export const difficultyGlowSoftClass: Record<DifficultyMode, string> = {
  easy: `glow glow-soft ${difficultyColor.easy}`,
  mixed: `glow glow-soft ${difficultyColor.mixed}`,
  hard: `glow glow-soft ${difficultyColor.hard}`,
};

export const resultGlowClass: Record<"correct" | "incorrect", string> = {
  correct: "glow glow-strong glow-green",
  incorrect: "glow glow-strong glow-red",
};

export type RgbTriplet = readonly [number, number, number];

export const difficultyAccentRgb: Record<DifficultyMode, RgbTriplet> = {
  easy: [34, 197, 94],
  mixed: [234, 179, 8],
  hard: [239, 68, 68],
};

export const NEUTRAL_ACCENT_RGB: RgbTriplet = [148, 163, 184];
