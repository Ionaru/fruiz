import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { render } from "preact-render-to-string";
import { CategoryFilterButton } from "../../../src/components/collection/CategoryFilterButton.tsx";
import { CategoryFilterList } from "../../../src/components/collection/CategoryFilterList.tsx";

function filterButton(isActive: boolean): string {
  return render(
    <CategoryFilterButton
      label="Nintendo"
      collected={34}
      total={52}
      isActive={isActive}
      onSelect={() => {}}
    />,
  );
}

Deno.test("CategoryFilterButton: reports its pressed state, not just a bold label", () => {
  assertStringIncludes(filterButton(true), 'aria-pressed="true"');
  assertStringIncludes(filterButton(false), 'aria-pressed="false"');
});

Deno.test("CategoryFilterButton: the active filter is tinted, not only weighted", () => {
  const active = filterButton(true);
  assertStringIncludes(active, "info");
  assertStringIncludes(active, "font-semibold");
  assert(
    !filterButton(false).includes("font-semibold"),
    "an inactive filter should not carry the active weight",
  );
});

Deno.test("CategoryFilterButton: announces the counts as words, not as '34 / 52'", () => {
  const html = filterButton(false);
  assertStringIncludes(html, 'aria-label="Nintendo, 34 of 52 collected"');
  // The visible counts are decorative once the label spells them out.
  assertStringIncludes(html, 'aria-hidden="true"');
});

Deno.test("CategoryFilterButton: shows the collected count on phones and both on desktop", () => {
  const html = filterButton(false);
  assertStringIncludes(html, '<span class="lg:hidden">34</span>');
  assertStringIncludes(html, "34 / 52");
});

Deno.test("CategoryFilterButton: keeps a touch-sized target", () => {
  assertStringIncludes(filterButton(false), "min-h-10");
});

Deno.test("CategoryFilterList: offers All plus every category, once", () => {
  const html = render(
    <CategoryFilterList
      options={[
        { name: "Nintendo", collected: 34, total: 52 },
        { name: "Video Games", collected: 115, total: 241 },
      ]}
      allTotals={{ collected: 115, total: 241 }}
      activeName={null}
      onSelect={() => {}}
    />,
  );
  assertEquals(html.match(/<button/g)?.length, 3);
  assertStringIncludes(html, 'aria-label="All, 115 of 241 collected"');
  assertStringIncludes(html, 'aria-label="Nintendo, 34 of 52 collected"');
});

Deno.test("CategoryFilterList: a category with nothing collected is still offered", () => {
  const html = render(
    <CategoryFilterList
      options={[{ name: "Arcade", collected: 0, total: 52 }]}
      allTotals={{ collected: 115, total: 241 }}
      activeName={null}
      onSelect={() => {}}
    />,
  );
  assertStringIncludes(html, 'aria-label="Arcade, 0 of 52 collected"');
});

Deno.test("CategoryFilterList: the filters are a group of toggles, not navigation", () => {
  const html = render(
    <CategoryFilterList
      options={[]}
      allTotals={{ collected: 0, total: 0 }}
      activeName={null}
      onSelect={() => {}}
    />,
  );
  assertStringIncludes(html, 'role="group"');
  assertStringIncludes(html, 'aria-label="Filter tracks by category"');
  assert(!html.includes("<nav"), "toggles should not be marked up as nav");
});
