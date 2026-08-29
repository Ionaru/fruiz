import { PlateauCard } from "../ui/PlateauCard.tsx";
import { SectionHeading } from "../ui/SectionHeading.tsx";
import { QuizCategoryCard } from "./QuizCategoryCard.tsx";
import type { AvailableQuizOption } from "../../lib/categories.ts";

export interface StartNewQuizSectionProps {
  options: AvailableQuizOption[];
  /**
   * Collected-track counts keyed by category slug, or `null` for signed-out
   * visitors — there is no collection to report progress against.
   */
  collectedBySlug?: Record<string, number> | null;
  class?: string;
}

export function StartNewQuizSection(
  { options, collectedBySlug = null, class: className }: Readonly<
    StartNewQuizSectionProps
  >,
) {
  return (
    <section class={["space-y-3", className].filter(Boolean).join(" ")}>
      <SectionHeading>Start new quiz</SectionHeading>
      {options.length === 0
        ? (
          <PlateauCard class="text-base-800 dark:text-base-100">
            No quizzes available yet. Seed categories and at least 20 tracks per
            difficulty mode.
          </PlateauCard>
        )
        : (
          <div class="grid gap-4 lg:grid-cols-2 lg:gap-5">
            {options.map((option) => (
              <QuizCategoryCard
                key={option.category.slug}
                category={option.category}
                difficulties={option.difficulties}
                totalTrackCount={option.totalTrackCount}
                collectedCount={collectedBySlug === null
                  ? null
                  : collectedBySlug[option.category.slug] ?? 0}
              />
            ))}
          </div>
        )}
    </section>
  );
}
