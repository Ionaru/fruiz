import { Button } from "../Button.tsx";
import { PlateauCard } from "../ui/PlateauCard.tsx";
import type { CategoryRow } from "../../lib/categories.ts";
import type { DifficultyMode } from "../../lib/types.ts";
import { difficultyGlowClass } from "./glow.ts";

export interface QuizCategoryCardProps {
  category: CategoryRow;
  difficulties: DifficultyMode[];
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
          {difficulties.map((d) => (
            <Button
              key={d}
              class={`px-6 capitalize ${difficultyGlowClass[d]}`}
              name="difficulty"
              value={d}
              type="submit"
            >
              {d}
            </Button>
          ))}
        </div>
      </form>
    </PlateauCard>
  );
}
