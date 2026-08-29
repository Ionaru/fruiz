import { assert, assertFalse, assertStringIncludes } from "@std/assert";
import { render } from "preact-render-to-string";
import { QuizCategoryCard } from "../../../src/components/quiz/QuizCategoryCard.tsx";
import type {
  CategoryRow,
  DifficultyOption,
} from "../../../src/lib/categories.ts";

const nintendo: CategoryRow = {
  id: "cat-1",
  name: "Nintendo",
  slug: "nintendo",
};

const bothModes: DifficultyOption[] = [
  { mode: "easy", trackCount: 32 },
  { mode: "hard", trackCount: 52 },
];

function markup(collectedCount: number | null): string {
  return render(
    <QuizCategoryCard
      category={nintendo}
      difficulties={bothModes}
      totalTrackCount={52}
      collectedCount={collectedCount}
    />,
  );
}

Deno.test("the card headlines the category's whole pool", () => {
  assertStringIncludes(markup(null), "52 tracks");
});

Deno.test("easy names its own pool size; hard defers to the category total", () => {
  const html = markup(null);
  assertStringIncludes(html, "32 well-known tracks");
  assertStringIncludes(html, "All tracks");
  assertFalse(
    html.includes("52 well-known"),
    "hard must not restate the category total on the button",
  );
});

Deno.test("each difficulty submits the form with its own mode", () => {
  const html = markup(null);
  assertStringIncludes(html, 'name="difficulty" value="easy"');
  assertStringIncludes(html, 'name="difficulty" value="hard"');
  assertStringIncludes(html, 'name="category" value="nintendo"');
});

Deno.test("the difficulty word carries the colour rather than a separate cap", () => {
  const html = markup(null);
  assertStringIncludes(html, "text-green-400");
  assertStringIncludes(html, "text-red-400");
});

Deno.test("the glow is the softened one, so adjacent buttons do not bleed together", () => {
  const html = markup(null);
  assertStringIncludes(html, "glow-soft");
  assertFalse(
    html.includes("glow-strong"),
    "the menu buttons moved off the strong halo",
  );
});

Deno.test("a signed-in player sees collection progress for the category", () => {
  const html = markup(18);
  assertStringIncludes(html, 'role="progressbar"');
  assertStringIncludes(html, "18 collected");
});

Deno.test("a category with nothing collected still shows an empty bar", () => {
  const html = markup(0);
  assertStringIncludes(html, 'role="progressbar"');
  assertStringIncludes(html, "0 collected");
  assertStringIncludes(html, 'aria-valuenow="0"');
});

Deno.test("a guest sees no progress bar and no collected count", () => {
  const html = markup(null);
  assertFalse(html.includes('role="progressbar"'));
  assertFalse(html.includes("collected"));
});

Deno.test("a difficulty that is unavailable is simply absent", () => {
  const html = render(
    <QuizCategoryCard
      category={nintendo}
      difficulties={[{ mode: "hard", trackCount: 25 }]}
      totalTrackCount={25}
      collectedCount={null}
    />,
  );
  assert(html.includes('value="hard"'));
  assertFalse(html.includes('value="easy"'));
});
