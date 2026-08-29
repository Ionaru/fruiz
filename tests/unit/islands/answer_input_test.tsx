import { assertStringIncludes } from "@std/assert";
import { render } from "preact-render-to-string";
import AnswerInput from "../../../src/islands/AnswerInput.tsx";

/** Opening tag of the combobox input, for attribute-level assertions. */
function comboboxTag(value: string, suggestions: string[]): string {
  const html = render(
    <AnswerInput
      instanceId="quiz"
      value={value}
      suggestions={suggestions}
      onValue={() => {}}
    />,
  );
  return html.match(/<input\s[^>]*>/)?.[0] ?? "";
}

// Only the closed state is reachable from a server render: `isOpen` starts
// false and flips solely inside browser event handlers, so no `render()` call
// can open the dropdown.
//
// Unlike the option rows, this attribute reaches the element through
// TextInput's prop spread rather than the JSX precompile path, so a raw
// boolean already serializes as "false" here. These tests therefore pin the
// rendered contract; they are not a guard against the boolean creeping back.
// The guard that does bite lives in answer_suggestion_option_test.tsx.
Deno.test("AnswerInput: the combobox reports its collapsed state as a literal string", () => {
  assertStringIncludes(
    comboboxTag("Wall", ["Wall-E", "Waldo"]),
    'aria-expanded="false"',
  );
  assertStringIncludes(comboboxTag("", []), 'aria-expanded="false"');
});

Deno.test("AnswerInput: aria-expanded sits on the combobox, beside its listbox wiring", () => {
  const tag = comboboxTag("Wall", ["Wall-E"]);
  assertStringIncludes(tag, 'role="combobox"');
  assertStringIncludes(tag, 'aria-autocomplete="list"');
  assertStringIncludes(tag, 'aria-controls="answer-listbox-quiz"');
  assertStringIncludes(tag, 'aria-expanded="false"');
});
