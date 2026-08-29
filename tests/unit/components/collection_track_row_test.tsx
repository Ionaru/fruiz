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

Deno.test("CollectionLockedItem: the slot has no surface of its own", () => {
  const html = render(<CollectionLockedItem />);
  const slotClasses = html.match(/<div class="([^"]*)"/)?.[1] ?? "";
  assert(
    !slotClasses.includes("plateau"),
    "a locked slot should sit on the page, not on a card of its own",
  );
  assert(
    !slotClasses.includes("nm-"),
    "a locked slot should carry no relief of its own",
  );
});

Deno.test("CollectionLockedItem: the badge is a dent in the page, with no fill", () => {
  const html = render(<CollectionLockedItem />);
  const badgeClasses = html.match(/<span class="([^"]*)"/)?.[1] ?? "";
  assertStringIncludes(badgeClasses, "nm-dent-sm");
  assert(
    !badgeClasses.includes("plateau"),
    "the badge should have no surface to lift it off the background",
  );
});

Deno.test("CollectionLockedItem: keeps a collected row's padding so the columns line up", () => {
  const slotClasses =
    render(<CollectionLockedItem />).match(/<div class="([^"]*)"/)?.[1] ?? "";
  for (const shared of ["gap-3", "py-2.5", "pl-4", "pr-3"]) {
    assertStringIncludes(slotClasses, shared);
  }
});

Deno.test("CollectionLetterDivider: is a heading the section can be labelled by", () => {
  const html = render(
    <CollectionLetterDivider letter="A" id="collection-letter-1" />,
  );
  assertStringIncludes(html, "<h2");
  assertStringIncludes(html, 'id="collection-letter-1"');
  assertStringIncludes(html, ">A<");
});
