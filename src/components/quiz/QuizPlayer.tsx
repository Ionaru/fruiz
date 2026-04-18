import type { ComponentChildren } from "preact";
import { FaArrowLeft } from "react-icons/fa";
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
        <a
          href="/"
          class="plateau rounded-full px-4 py-3 text-center no-underline font-medium min-h-11 flex items-center justify-center gap-2 text-base-900 dark:text-base-100"
        >
          <FaArrowLeft />
          Back to home
        </a>
        <PlateauCard padding="5" variant="info">
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
