import { assertEquals, assertStringIncludes } from "@std/assert";
import { render } from "preact-render-to-string";
import { CollectionProgressPanel } from "../../../src/components/collection/CollectionProgressPanel.tsx";
import { CollectionSearchField } from "../../../src/components/collection/CollectionSearchField.tsx";

Deno.test("CollectionProgressPanel: shows collected against the full corpus", () => {
  const html = render(<CollectionProgressPanel collected={115} total={241} />);
  assertStringIncludes(html, "115");
  assertStringIncludes(html, "241");
  assertStringIncludes(html, "tracks collected");
});

Deno.test("CollectionProgressPanel: the hidden count is the remainder", () => {
  const html = render(<CollectionProgressPanel collected={115} total={241} />);
  assertStringIncludes(html, "126 tracks still hidden");
});

Deno.test("CollectionProgressPanel: one remaining track reads as singular", () => {
  const html = render(<CollectionProgressPanel collected={240} total={241} />);
  assertStringIncludes(html, "1 track still hidden");
});

Deno.test("CollectionProgressPanel: a finished collection is not '0 tracks still hidden'", () => {
  const html = render(<CollectionProgressPanel collected={241} total={241} />);
  assertStringIncludes(html, "Every track collected");
});

Deno.test("CollectionProgressPanel: drives the shared progress bar", () => {
  const html = render(<CollectionProgressPanel collected={115} total={241} />);
  assertStringIncludes(html, 'role="progressbar"');
  assertStringIncludes(html, 'aria-label="Collection progress"');
  assertEquals(html.match(/aria-valuenow="(\d+)"/)?.[1], "48");
});

Deno.test("CollectionProgressPanel: an empty corpus renders an empty bar, not NaN", () => {
  const html = render(<CollectionProgressPanel collected={0} total={0} />);
  assertEquals(html.match(/aria-valuenow="(\d+)"/)?.[1], "0");
});

Deno.test("CollectionSearchField: the input carries a real, associated label", () => {
  const html = render(
    <CollectionSearchField
      value=""
      onQueryChange={() => {}}
      resultSummary="115 tracks shown"
    />,
  );
  assertStringIncludes(html, 'for="collection-search"');
  assertStringIncludes(html, 'id="collection-search"');
  assertStringIncludes(html, 'type="search"');
});

Deno.test("CollectionSearchField: filtering is announced politely, not shouted", () => {
  const html = render(
    <CollectionSearchField
      value="zelda"
      onQueryChange={() => {}}
      resultSummary="3 tracks shown"
    />,
  );
  assertStringIncludes(html, 'aria-live="polite"');
  assertStringIncludes(html, "3 tracks shown");
});
