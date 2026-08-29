import { Button } from "../Button.tsx";
import { PlateauCard } from "../ui/PlateauCard.tsx";
import { ProgressBar } from "../ui/ProgressBar.tsx";
import type { CategoryRow, DifficultyOption } from "../../lib/categories.ts";
import type { DifficultyMode } from "../../lib/types.ts";
import { difficultyGlowClass } from "./glow.ts";

export interface QuizCategoryCardProps {
  category: CategoryRow;
  difficulties: DifficultyOption[];
  /** Size of the category's whole pool, shown as the card's headline figure. */
  totalTrackCount: number;
  /** Tracks this player has collected here, or `null` for signed-out visitors. */
  collectedCount?: number | null;
}

const difficultyLabelClass: Record<DifficultyMode, string> = {
  easy: "text-green-400",
  hard: "text-red-400",
};

/**
 * What each mode actually draws from. Easy names its pool size because that is
 * the number that differs; hard deliberately does not repeat the category total
 * already printed at the top of the card.
 */
function difficultyDetail(option: DifficultyOption): string {
  return option.mode === "easy"
    ? `${option.trackCount} well-known tracks`
    : "All tracks";
}

export function QuizCategoryCard(
  { category, difficulties, totalTrackCount, collectedCount = null }: Readonly<
    QuizCategoryCardProps
  >,
) {
  const showsProgress = collectedCount !== null;
  return (
    <PlateauCard padding="4">
      <form method="post">
        <input type="hidden" name="category" value={category.slug} />
        <div class="mb-1.5 flex items-baseline justify-between gap-2.5">
          <h3 class="text-xl font-medium">{category.name}</h3>
          <span class="shrink-0 text-xs tabular-nums opacity-45">
            {totalTrackCount} tracks
            {showsProgress && (
              <span class="lg:hidden">{` · ${collectedCount} collected`}</span>
            )}
          </span>
        </div>
        {showsProgress && (
          <div class="mb-3.5 flex items-center gap-2.5">
            <ProgressBar
              class="flex-1"
              value={collectedCount}
              max={totalTrackCount}
              label={`${category.name} collection progress`}
            />
            <span class="hidden shrink-0 text-xs tabular-nums opacity-45 lg:inline">
              {collectedCount} collected
            </span>
          </div>
        )}
        <div class="relative isolate grid grid-cols-2 gap-2.5">
          {difficulties.map((option) => (
            <Button
              key={option.mode}
              shape="card"
              class={`flex-col gap-0.5 leading-tight ${
                difficultyGlowClass[option.mode]
              }`}
              name="difficulty"
              value={option.mode}
              type="submit"
            >
              <span
                class={`text-base font-semibold capitalize ${
                  difficultyLabelClass[option.mode]
                }`}
              >
                {option.mode}
              </span>
              <span class="text-xs font-normal tabular-nums opacity-55">
                {difficultyDetail(option)}
              </span>
            </Button>
          ))}
        </div>
      </form>
    </PlateauCard>
  );
}
