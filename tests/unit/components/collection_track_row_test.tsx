import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { render } from "preact-render-to-string";
import {
  CollectionTrackCategories,
  CollectionTrackTitle,
} from "../../../src/components/collection/CollectionTrackLabel.tsx";
import { CollectionLockedItem } from "../../../src/components/collection/CollectionLockedItem.tsx";
import { CollectionLetterDivider } from "../../../src/components/collection/CollectionLetterDivider.tsx";

Deno.test("CollectionTrackTitle: renders the title and truncates rather than wrapping", () => {
  const html = render(
    <CollectionTrackTitle title="Animal Crossing: New Horizons" />,
  );
  assertStringIncludes(html, "Animal Crossing: New Horizons");
  assertStringIncludes(html, "truncate");
});

Deno.test("CollectionTrackCategories: joins with a middot, not a comma", () => {
  const html = render(
    <CollectionTrackCategories categories={["Video Games", "Nintendo"]} />,
  );
  assertStringIncludes(html, "Video Games · Nintendo");
  assert(
    !html.includes("Video Games, Nintendo"),
    "the separator regressed to a comma",
  );
});

Deno.test("CollectionTrackCategories: renders nothing for an uncategorized track", () => {
  assertEquals(render(<CollectionTrackCategories categories={[]} />), "");
});

Deno.test("CollectionLockedItem: says it is uncollected without naming the track", () => {
  const html = render(<CollectionLockedItem />);
  assertStringIncludes(html, "Not collected yet");
  assertStringIncludes(html, "Guess it right in a quiz to unlock");
});

Deno.test("CollectionLockedItem: offers nothing to activate", () => {
  const html = render(<CollectionLockedItem />);
  assert(!html.includes("<button"), "a locked slot must not be a control");
  assert(!html.includes("<a "), "a locked slot must not be a link");
});

Deno.test("CollectionLockedItem: the repeated hint is not announced 126 times", () => {
  const html = render(<CollectionLockedItem />);
  const hintIndex = html.indexOf("Guess it right in a quiz to unlock");
  const hiddenIndex = html.lastIndexOf('aria-hidden="true"', hintIndex);
  assert(hiddenIndex !== -1, "the hint line should be aria-hidden");
});

Deno.test("CollectionLockedItem: reads as recessed rather than raised", () => {
  assertStringIncludes(render(<CollectionLockedItem />), "nm-dent-sm");
});

Deno.test("CollectionLetterDivider: is a heading the section can be labelled by", () => {
  const html = render(
    <CollectionLetterDivider letter="A" id="collection-letter-1" />,
  );
  assertStringIncludes(html, "<h2");
  assertStringIncludes(html, 'id="collection-letter-1"');
  assertStringIncludes(html, ">A<");
});
