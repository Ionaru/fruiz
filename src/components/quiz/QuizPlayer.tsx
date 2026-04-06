import type { ComponentChildren } from "preact";
import { PageShell } from "../layout/PageShell.tsx";
import { PlateauCard } from "../ui/PlateauCard.tsx";
import type { CategoryRow } from "../../lib/categories.ts";
import type { DifficultyMode } from "../../lib/types.ts";

export interface QuizPlayerProps {
  category: CategoryRow;
  children: ComponentChildren;
  difficulty: DifficultyMode;
}

const DIFFICULTY_DETAILS: Record<DifficultyMode, string> = {
  easy: "Main title themes and recognizable tracks.",
  mixed: "A mix of recognizable themes and more obscure tracks.",
  hard: "More obscure tracks and deeper cuts.",
};

export function QuizPlayer(props: Readonly<QuizPlayerProps>) {
  return (
    <PageShell paddingY="6">
      <div class="max-w-lg mx-auto flex flex-col gap-6 text-base-900 dark:text-base-100">
        <PlateauCard padding="5">
          <p class="text-sm opacity-80">Category</p>
          <h1 class="text-2xl font-semibold">{props.category.name}</h1>
          <div class="flex items-center gap-2">
            <span class="bg-blue-300 dark:bg-blue-900 px-1.5 py-0.5 rounded-md capitalize">{props.difficulty}</span>
            <span class="text-sm opacity-80">{DIFFICULTY_DETAILS[props.difficulty]}</span>
          </div>
        </PlateauCard>
        {props.children}
      </div>
    </PageShell>
  );
}
