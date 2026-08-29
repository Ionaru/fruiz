import { assertFalse, assertStringIncludes } from "@std/assert";
import { render } from "preact-render-to-string";
import { InProgressQuizItem } from "../../../src/components/quiz/InProgressQuizItem.tsx";
import type { InProgressQuizEntry } from "../../../src/lib/types.ts";

const hardNintendo: InProgressQuizEntry = {
  storageKey: "quiz:/quiz/nintendo/hABC",
  quizPath: "/quiz/nintendo/hABC",
  category: "nintendo",
  slug: "hABC",
  difficulty: "hard",
  answered: 7,
  total: 20,
};

/** Opening tags of every button in the markup, for attribute-level assertions. */
function buttonTags(html: string): string[] {
  return [...html.matchAll(/<button\s[^>]*>/g)].map((match) => match[0]);
}

function markup(
  entry: InProgressQuizEntry,
  categoryName = "Nintendo",
): string {
  return render(
    <InProgressQuizItem
      entry={entry}
      categoryName={categoryName}
      onResume={() => {}}
      onDelete={() => {}}
      onShare={() => {}}
    />,
  );
}

Deno.test("the card leads with the category name and its progress", () => {
  const html = markup(hardNintendo);
  assertStringIncludes(html, "Nintendo");
  assertStringIncludes(html, "· 7 of 20");
});

Deno.test("the resolved display name is used, not the raw slug", () => {
  const html = markup(
    { ...hardNintendo, category: "video-games" },
    "Video Games",
  );
  assertStringIncludes(html, "Video Games");
});

Deno.test("the quiz code sits beside the name and keeps its own casing", () => {
  const html = markup(hardNintendo);
  assertStringIncludes(html, "hAB");
  // `capitalize` renders the code as "HAB" if it reaches it, so it is scoped to
  // the name — which needs it for the nameFromSlug fallback.
  assertStringIncludes(
    html,
    '<span class="truncate font-medium capitalize">Nintendo</span>',
  );
  assertFalse(
    /capitalize[^"]*">\s*hAB/.test(html),
    "the quiz code must not inherit capitalize",
  );
});

Deno.test("a long category name truncates instead of squeezing out the code", () => {
  const html = markup(hardNintendo, "Nintendo Handheld Classics");
  // truncate belongs on the name (a flex container cannot ellipsize its own
  // children) and the code holds its width with shrink-0.
  assertStringIncludes(html, 'class="truncate font-medium capitalize"');
  assertStringIncludes(
    html,
    'class="shrink-0 text-xs tabular-nums opacity-50"',
  );
});

Deno.test("progress is exposed as a real progressbar", () => {
  const html = markup(hardNintendo);
  assertStringIncludes(html, 'role="progressbar"');
  assertStringIncludes(html, 'aria-valuenow="35"');
});

Deno.test("the bar is tinted by difficulty", () => {
  assertStringIncludes(markup(hardNintendo), "bg-red-400");
  assertStringIncludes(
    markup({ ...hardNintendo, difficulty: "easy" }),
    "bg-green-400",
  );
});

Deno.test("the icon-only actions keep a visually hidden text label", () => {
  const html = markup(hardNintendo);
  assertStringIncludes(
    html,
    '<span class="sr-only">Copy link to this quiz</span>',
  );
  assertStringIncludes(
    html,
    '<span class="sr-only">Delete saved progress</span>',
  );
  assertFalse(
    buttonTags(html).some((tag) => tag.includes("aria-label")),
    "the header pattern names icon buttons with sr-only text, not aria-label",
  );
});

Deno.test("resume stays the labelled primary action", () => {
  assertStringIncludes(markup(hardNintendo), ">Resume</button>");
});
