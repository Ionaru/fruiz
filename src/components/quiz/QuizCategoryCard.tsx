import { Button } from "../Button.tsx";
import { PlateauCard } from "../ui/PlateauCard.tsx";
import type { CategoryRow, DifficultyOption } from "../../lib/categories.ts";
import { difficultyGlowClass } from "./glow.ts";

export interface QuizCategoryCardProps {
  category: CategoryRow;
  difficulties: DifficultyOption[];
}

export function QuizCategoryCard(
  { category, difficulties }: Readonly<QuizCategoryCardProps>,
) {
  return (
    <PlateauCard padding="5">
      <form method="post" class="space-y-4">
        <input type="hidden" name="category" value={category.slug} />
        <h3 class="text-xl font-medium text-base-900 dark:text-base-100">
          {category.name}
        </h3>
        <div class="relative isolate flex flex-wrap gap-2">
          {difficulties.map(({ mode, trackCount }) => (
            <Button
              key={mode}
              class={`flex-col gap-0.5 px-6 leading-tight capitalize ${
                difficultyGlowClass[mode]
              }`}
              name="difficulty"
              value={mode}
              type="submit"
            >
              <span>{mode}</span>
              <span class="text-xs font-normal tabular-nums normal-case opacity-60">
                {trackCount} available
              </span>
            </Button>
          ))}
        </div>
      </form>
    </PlateauCard>
  );
}
