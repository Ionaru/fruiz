import type { ComponentChildren } from "preact";
import { PageShell } from "../layout/PageShell.tsx";
import { PlateauCard } from "../ui/PlateauCard.tsx";
import type { CategoryRow } from "../../lib/categories.ts";
import type { DifficultyMode } from "../../lib/types.ts";
import { HomeButton } from "../ui/HomeButton.tsx";
import { difficultyGlowSoftClass } from "./glow.ts";

export interface QuizPlayerProps {
  category: CategoryRow;
  children: ComponentChildren;
  difficulty: DifficultyMode;
}

const DIFFICULTY_DETAILS: Record<DifficultyMode, string> = {
  easy: "Main title themes and recognizable tracks.",
  hard: "A mix of recognizable themes and more obscure tracks.",
};

export function QuizPlayer(props: Readonly<QuizPlayerProps>) {
  return (
    <PageShell paddingY="6">
      <div class="relative isolate max-w-lg mx-auto flex flex-col gap-2 sm:gap-6 text-base-900 dark:text-base-100">
        <nav class="w-full">
          <HomeButton />
        </nav>
        <PlateauCard
          padding="5"
          class={difficultyGlowSoftClass[props.difficulty]}
        >
          <h1 class="text-2xl font-semibold text-center">
            {props.category.name}
          </h1>
          <div class="flex items-center gap-2 justify-center mt-2">
            <span class="text-sm opacity-80 text-center">
              {DIFFICULTY_DETAILS[props.difficulty]}
            </span>
          </div>
        </PlateauCard>
        {props.children}
      </div>
    </PageShell>
  );
}
