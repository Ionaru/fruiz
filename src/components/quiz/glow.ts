import type { DifficultyMode } from "../../lib/types.ts";

const difficultyColor: Record<DifficultyMode, string> = {
  easy: "glow-green",
  hard: "glow-red",
};

export const difficultyGlowClass: Record<DifficultyMode, string> = {
  easy: `glow glow-strong ${difficultyColor.easy}`,
  hard: `glow glow-strong ${difficultyColor.hard}`,
};

// Hard mode gets the animated rainbow halo on the player header (soft glow),
// while the category-select buttons (strong glow) keep the red accent.
const RAINBOW_GLOW = "glow-rainbow glow-rainbow-animate";

export const difficultyGlowSoftClass: Record<DifficultyMode, string> = {
  easy: `glow glow-soft ${difficultyColor.easy}`,
  hard: `glow glow-soft ${RAINBOW_GLOW}`,
};

export const resultGlowClass: Record<"correct" | "incorrect", string> = {
  correct: "glow glow-strong glow-green",
  incorrect: "glow glow-strong glow-red",
};
