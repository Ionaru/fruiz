import { assertEquals } from "@std/assert";
import { planVisibleBandScroll } from "../../../src/lib/visibleBand.ts";

const EDGE_CLEARANCE = 8;

/**
 * A phone with the on-screen keyboard up: the layout viewport is still 915 tall,
 * but only a 430-tall band starting 299 down it is painted. Same 412x915 Android
 * profile the suggestion-popup tests use, so the two sets of numbers line up.
 */
const KEYBOARD_BAND = { top: 299, height: 430 };
/** The answer field, centred in the band where Blink parks a focused editable. */
const FIELD = { top: 488, bottom: 538 };

Deno.test("planVisibleBandScroll: leaves the page alone when the row is already visible", () => {
  assertEquals(
    planVisibleBandScroll({
      band: KEYBOARD_BAND,
      // Band bottom is 729, and the row ends well above it.
      bringIntoView: { top: 600, bottom: 644 },
      keepInView: FIELD,
      edgeClearance: EDGE_CLEARANCE,
    }),
    0,
  );
});

Deno.test("planVisibleBandScroll: lifts a covered row to the clearance line", () => {
  assertEquals(
    planVisibleBandScroll({
      band: KEYBOARD_BAND,
      // 20 px of the row sit past the band, and the clearance asks for 8 more.
      bringIntoView: { top: 705, bottom: 749 },
      keepInView: FIELD,
      edgeClearance: EDGE_CLEARANCE,
    }),
    28,
  );
});

Deno.test("planVisibleBandScroll: counts a row entirely below the band", () => {
  assertEquals(
    planVisibleBandScroll({
      band: KEYBOARD_BAND,
      // Fully hidden by the keyboard: 831 + 8 - 729.
      bringIntoView: { top: 787, bottom: 831 },
      // Sitting high enough that the whole distance is affordable.
      keepInView: { top: 700, bottom: 750 },
      edgeClearance: EDGE_CLEARANCE,
    }),
    110,
  );
});

Deno.test("planVisibleBandScroll: stops before the focused field leaves the band", () => {
  assertEquals(
    planVisibleBandScroll({
      band: KEYBOARD_BAND,
      // Asks for 110, but the field only has 488 - 299 - 8 = 181 of headroom…
      bringIntoView: { top: 787, bottom: 831 },
      keepInView: FIELD,
      edgeClearance: EDGE_CLEARANCE,
    }),
    110,
  );
  assertEquals(
    planVisibleBandScroll({
      band: KEYBOARD_BAND,
      // …and here the row asks for 291, which is more than that headroom.
      bringIntoView: { top: 968, bottom: 1012 },
      keepInView: FIELD,
      edgeClearance: EDGE_CLEARANCE,
    }),
    181,
  );
});

Deno.test("planVisibleBandScroll: gives up when freeing the row would only hide the field", () => {
  const field = { top: 303, bottom: 353 };
  assertEquals(
    planVisibleBandScroll({
      band: KEYBOARD_BAND,
      bringIntoView: { top: 787, bottom: 831 },
      // The field is already within the clearance of the top edge.
      keepInView: field,
      edgeClearance: EDGE_CLEARANCE,
    }),
    0,
  );
});

Deno.test("planVisibleBandScroll: is a no-op on a viewport nothing covers", () => {
  assertEquals(
    planVisibleBandScroll({
      band: { top: 0, height: 900 },
      bringIntoView: { top: 700, bottom: 744 },
      keepInView: { top: 600, bottom: 650 },
      edgeClearance: EDGE_CLEARANCE,
    }),
    0,
  );
});

Deno.test("planVisibleBandScroll: returns whole pixels", () => {
  const delta = planVisibleBandScroll({
    band: { top: 0, height: 500 },
    bringIntoView: { top: 480.4, bottom: 524.6 },
    keepInView: { top: 300.2, bottom: 350.2 },
    edgeClearance: EDGE_CLEARANCE,
  });
  assertEquals(delta, Math.round(delta));
  // 524.6 + 8 - 500
  assertEquals(delta, 33);
});
