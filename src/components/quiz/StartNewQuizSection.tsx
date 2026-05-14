import { PlateauCard } from "../ui/PlateauCard.tsx";
import { QuizCategoryCard } from "./QuizCategoryCard.tsx";
import type { AvailableQuizOption } from "../../lib/categories.ts";

export interface StartNewQuizSectionProps {
  options: AvailableQuizOption[];
}

export function StartNewQuizSection(
  { options }: Readonly<StartNewQuizSectionProps>,
) {
  return (
    <section class="space-y-3">
      <h2 class="text-lg font-medium text-base-900 dark:text-base-100">
        Start new quiz
      </h2>
      {options.length === 0
        ? (
          <PlateauCard class="text-base-800 dark:text-base-100">
            No quizzes available yet. Seed categories and at least 20 tracks per
            difficulty mode.
          </PlateauCard>
        )
        : (
          <div class="flex flex-col gap-6">
            {options.map((opt) => (
              <QuizCategoryCard
                key={opt.category.slug}
                category={opt.category}
                difficulties={opt.difficulties}
              />
            ))}
          </div>
        )}
    </section>
  );
}
