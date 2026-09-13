import { assertEquals } from "@std/assert";
import { planSuggestionPopup } from "../../../src/lib/suggestionPopupLayout.ts";

const SPACING = { anchorGap: 8, edgeClearance: 8, flipBelowHeight: 132 };

/**
 * A phone with the on-screen keyboard up: the layout viewport is still 915
 * tall, but only a 430-tall band starting 299 down it is painted. From a
 * 412x915 Android profile, field centred in the band where Blink parks a newly
 * focused editable.
 */
const KEYBOARD_BAND = { top: 299, height: 430 };
const FIELD = { top: 488, bottom: 538 };

Deno.test("planSuggestionPopup: caps the popup at the room left below the field", () => {
  const layout = planSuggestionPopup({
    anchor: FIELD,
    band: KEYBOARD_BAND,
    contentHeight: 900,
    minHeight: 44,
    ...SPACING,
  });
  assertEquals(layout.placement, "below");
  // 299 + 430 - 538 - 8 - 8
  assertEquals(layout.maxHeight, 175);
});

Deno.test("planSuggestionPopup: never asks for more height than the list has", () => {
  const layout = planSuggestionPopup({
    anchor: FIELD,
    band: KEYBOARD_BAND,
    contentHeight: 90,
    minHeight: 44,
    ...SPACING,
  });
  assertEquals(layout.maxHeight, 90);
});

Deno.test("planSuggestionPopup: flips above when the room below is too cramped to scan", () => {
  const layout = planSuggestionPopup({
    // A field sitting low in the band: 100 below it, 250 above it.
    anchor: { top: 350, bottom: 400 },
    band: { top: 84, height: 432 },
    contentHeight: 900,
    minHeight: 44,
    ...SPACING,
  });
  assertEquals(layout.placement, "above");
  // 350 - 84 - 8 - 8
  assertEquals(layout.maxHeight, 250);
});

Deno.test("planSuggestionPopup: stays below when there is more room above but enough below", () => {
  const layout = planSuggestionPopup({
    // 184 below the field, 634 above it: roomier above, but below is workable,
    // and staying put keeps the clip's play button uncovered. This is the
    // desktop case.
    anchor: { top: 658, bottom: 708 },
    band: { top: 0, height: 908 },
    contentHeight: 900,
    minHeight: 44,
    ...SPACING,
  });
  assertEquals(layout.placement, "below");
  assertEquals(layout.maxHeight, 184);
});

Deno.test("planSuggestionPopup: stays below when neither side has room to spare", () => {
  const layout = planSuggestionPopup({
    // Below is cramped, but above is worse, so flipping would gain nothing.
    anchor: { top: 40, bottom: 90 },
    band: { top: 0, height: 200 },
    contentHeight: 900,
    minHeight: 44,
    ...SPACING,
  });
  assertEquals(layout.placement, "below");
  assertEquals(layout.maxHeight, 94);
});

Deno.test("planSuggestionPopup: stays below on a tie, matching reading order", () => {
  const layout = planSuggestionPopup({
    anchor: { top: 300, bottom: 350 },
    band: { top: 100, height: 450 },
    contentHeight: 900,
    minHeight: 44,
    ...SPACING,
  });
  assertEquals(layout.placement, "below");
});

Deno.test("planSuggestionPopup: shrinks to one row rather than disappearing", () => {
  const layout = planSuggestionPopup({
    // Both sides are squeezed to almost nothing.
    anchor: { top: 10, bottom: 60 },
    band: { top: 8, height: 60 },
    contentHeight: 900,
    minHeight: 44,
    ...SPACING,
  });
  assertEquals(layout.maxHeight, 44);
});

Deno.test("planSuggestionPopup: uses the whole viewport when nothing covers it", () => {
  const layout = planSuggestionPopup({
    anchor: { top: 300, bottom: 350 },
    band: { top: 0, height: 900 },
    contentHeight: 900,
    minHeight: 44,
    ...SPACING,
  });
  assertEquals(layout.placement, "below");
  assertEquals(layout.maxHeight, 534);
});
