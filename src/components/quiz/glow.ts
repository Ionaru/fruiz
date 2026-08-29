import type { DifficultyMode } from "../../lib/types.ts";

const difficultyColor: Record<DifficultyMode, string> = {
  easy: "glow-green",
  hard: "glow-red",
};

// The category-select buttons carry the colour on the Easy / Hard label itself,
// so the halo only has to hint at difficulty rather than announce it. A strong
// glow behind two full-width buttons sitting side by side bled into one another.
export const difficultyGlowClass: Record<DifficultyMode, string> = {
  easy: `glow glow-soft ${difficultyColor.easy}`,
  hard: `glow glow-soft ${difficultyColor.hard}`,
};

// Hard mode gets the animated rainbow halo on the player header, while the
// category-select buttons above keep the red accent.
const RAINBOW_GLOW = "glow-rainbow glow-rainbow-animate";

export const difficultyGlowSoftClass: Record<DifficultyMode, string> = {
  easy: `glow glow-soft ${difficultyColor.easy}`,
  hard: `glow glow-soft ${RAINBOW_GLOW}`,
};

export const resultGlowClass: Record<"correct" | "incorrect", string> = {
  correct: "glow glow-strong glow-green",
  incorrect: "glow glow-strong glow-red",
};
