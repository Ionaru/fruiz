import { assertEquals, assertStringIncludes } from "@std/assert";
import { render } from "preact-render-to-string";
import { ProgressBar } from "../../../src/components/ui/ProgressBar.tsx";

function reportedPercent(value: number, max: number): number {
  const html = render(
    <ProgressBar value={value} max={max} label="Progress" />,
  );
  return Number(html.match(/aria-valuenow="(\d+)"/)?.[1] ?? Number.NaN);
}

Deno.test("ProgressBar: reports completion as a percentage", () => {
  assertEquals(reportedPercent(18, 52), 35);
});

Deno.test("ProgressBar: a zero total renders empty rather than dividing by zero", () => {
  assertEquals(reportedPercent(0, 0), 0);
  assertEquals(reportedPercent(5, 0), 0);
});

Deno.test("ProgressBar: a negative total is treated as empty", () => {
  assertEquals(reportedPercent(5, -10), 0);
});

Deno.test("ProgressBar: value is clamped into the 0..max range", () => {
  assertEquals(reportedPercent(-4, 50), 0);
  assertEquals(reportedPercent(80, 50), 100);
});

Deno.test("ProgressBar: exposes an accessible name and progressbar semantics", () => {
  const html = render(
    <ProgressBar value={7} max={20} label="Nintendo quiz progress" />,
  );
  assertStringIncludes(html, 'role="progressbar"');
  assertStringIncludes(html, 'aria-label="Nintendo quiz progress"');
  assertStringIncludes(html, 'aria-valuemin="0"');
  assertStringIncludes(html, 'aria-valuemax="100"');
});

Deno.test("ProgressBar: tone selects the fill colour", () => {
  const collection = render(
    <ProgressBar value={1} max={2} label="Collection" tone="info" />,
  );
  const hardQuiz = render(
    <ProgressBar value={1} max={2} label="Quiz" tone="danger" />,
  );
  assertStringIncludes(collection, "bg-blue-400");
  assertStringIncludes(hardQuiz, "bg-red-400");
});
