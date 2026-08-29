import { assert, assertStringIncludes } from "@std/assert";
import { render } from "preact-render-to-string";
import { AnswerSuggestionOption } from "../../../src/components/quiz/AnswerSuggestionOption.tsx";

/** Opening tag of the rendered option row, for attribute-level assertions. */
function optionTag(isActive: boolean): string {
  const html = render(
    <AnswerSuggestionOption
      id="answer-listbox-quiz-opt-0"
      title="Wall-E"
      isActive={isActive}
      onSelect={() => {}}
      onHoverActivate={() => {}}
    />,
  );
  return html.match(/<li\s[^>]*>/)?.[0] ?? "";
}

// The literal strings are the whole point: Preact renders a raw `{true}` as a
// bare valueless attribute and drops the attribute entirely when false, either
// of which leaves the listbox with no option marked as the selected one.
Deno.test("AnswerSuggestionOption: reports its selected state as a literal string", () => {
  assertStringIncludes(optionTag(true), 'aria-selected="true"');
  assertStringIncludes(optionTag(false), 'aria-selected="false"');
});

Deno.test("AnswerSuggestionOption: the active row is tinted as well as selected", () => {
  assertStringIncludes(optionTag(true), "bg-base-300");
  assert(
    !optionTag(false).includes("bg-base-300"),
    "an inactive option should not carry the active tint",
  );
});

Deno.test("AnswerSuggestionOption: the row stays an addressable listbox option", () => {
  const tag = optionTag(false);
  assertStringIncludes(tag, 'role="option"');
  assertStringIncludes(tag, 'id="answer-listbox-quiz-opt-0"');
});
