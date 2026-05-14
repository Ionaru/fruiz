import { Button } from "../Button.tsx";
import { PlateauCard } from "../ui/PlateauCard.tsx";
import type { CategoryRow } from "../../lib/categories.ts";
import type { DifficultyMode } from "../../lib/types.ts";

const difficultyGlowClass: Record<DifficultyMode, string> = {
  easy:
    "before:shadow-[0_0_16px_4px_rgb(34_197_94/0.75),0_0_36px_12px_rgb(34_197_94/0.35)]",
  mixed:
    "before:shadow-[0_0_16px_4px_rgb(234_179_8/0.75),0_0_36px_12px_rgb(234_179_8/0.35)]",
  hard:
    "before:shadow-[0_0_16px_4px_rgb(239_68_68/0.75),0_0_36px_12px_rgb(239_68_68/0.35)]",
};

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
              class={`relative px-6 capitalize before:content-[''] before:absolute before:inset-0 before:rounded-full before:pointer-events-none before:-z-10 ${
                difficultyGlowClass[d]
              }`}
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
