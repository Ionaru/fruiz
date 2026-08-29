import { assertEquals, assertStringIncludes } from "@std/assert";
import { render } from "preact-render-to-string";
import { SectionHeading } from "../../../src/components/ui/SectionHeading.tsx";

const MARGIN_UTILITY = /^-?(m|mx|my|ms|me|mt|mr|mb|ml)-/;

/** Class tokens with any variant prefixes (`lg:`, `dark:`, …) stripped off. */
function utilityTokens(html: string): string[] {
  const classAttribute = html.match(/class="([^"]*)"/)?.[1] ?? "";
  return classAttribute.split(/\s+/).filter(Boolean).map((token) =>
    token.split(":").at(-1) ?? token
  );
}

Deno.test("the heading renders its label in a level-two heading", () => {
  const html = render(<SectionHeading>Start new quiz</SectionHeading>);
  assertStringIncludes(html, "<h2");
  assertStringIncludes(html, ">Start new quiz</h2>");
});

Deno.test("the heading carries no margin utility of its own", () => {
  // A margin class on the heading silently wins over a parent's `space-y-*`,
  // which Tailwind emits as a zero-specificity `:where()` rule. That once left
  // the menu's headings sitting flush against their cards with no visible sign
  // in the JSX, so spacing stays the parent section's job.
  const margins = utilityTokens(render(<SectionHeading>Resume</SectionHeading>))
    .filter((token) => MARGIN_UTILITY.test(token));
  assertEquals(margins, []);
});

Deno.test("caller classes are appended to the heading's own", () => {
  const html = render(
    <SectionHeading class="text-center">Resume</SectionHeading>,
  );
  const tokens = utilityTokens(html);
  assertEquals(tokens.includes("text-center"), true);
  assertEquals(tokens.includes("uppercase"), true);
});
