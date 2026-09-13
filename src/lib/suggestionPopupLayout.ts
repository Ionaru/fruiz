import type { AnchorBounds, VisibleBand } from "./visibleBand.ts";

/**
 * Geometry for the answer combobox's suggestion popup.
 *
 * The popup is absolutely positioned, so on a phone it is laid out in a
 * viewport the on-screen keyboard does not shrink. It is therefore sized
 * against the visible band instead; see
 * [`./visibleBand.ts`](./visibleBand.ts) for why. Pure and DOM-free, so the
 * island takes the measurements and applies the result.
 */

/** Which side of the anchor the popup hangs off. */
export type SuggestionPlacement = "below" | "above";

/** Spacing the popup keeps from its anchor and from the edges of the band. */
export interface SuggestionSpacing {
  /** Gap between the anchor and the popup. */
  anchorGap: number;
  /** Gap kept between the popup and the edge of the visible band. */
  edgeClearance: number;
}

export interface SuggestionPopupLayout {
  placement: SuggestionPlacement;
  maxHeight: number;
}

export interface SuggestionPopupInput extends SuggestionSpacing {
  anchor: AnchorBounds;
  band: VisibleBand;
  /** Height the whole list would take if nothing capped it. */
  contentHeight: number;
  /** Floor for the cap, so a cramped popup shrinks rather than disappearing. */
  minHeight: number;
  /** Below this much room, hanging under the anchor stops being worth it. */
  flipBelowHeight: number;
}

function spaceBelowAnchor(input: SuggestionPopupInput) {
  const bandBottom = input.band.top + input.band.height;
  return bandBottom - input.anchor.bottom - input.anchorGap -
    input.edgeClearance;
}

function spaceAboveAnchor(input: SuggestionPopupInput) {
  return input.anchor.top - input.band.top - input.anchorGap -
    input.edgeClearance;
}

/**
 * Where the popup goes and how tall it may be, so that it always ends inside the
 * visible band.
 *
 * Hanging below the anchor is the default: it matches reading order and leaves
 * the clip's play button uncovered, which matters because players replay the
 * clip while they scan the titles. It flips above only when the room below has
 * dropped under `flipBelowHeight` and the other side is genuinely roomier (the
 * case the on-screen keyboard creates); more room above alone is not enough.
 */
export function planSuggestionPopup(
  input: SuggestionPopupInput,
): SuggestionPopupLayout {
  const availableBelow = spaceBelowAnchor(input);
  const availableAbove = spaceAboveAnchor(input);
  const belowIsCramped = availableBelow < input.flipBelowHeight;
  const placement: SuggestionPlacement =
    belowIsCramped && availableAbove > availableBelow ? "above" : "below";
  const available = placement === "above" ? availableAbove : availableBelow;
  const capped = Math.min(input.contentHeight, available);
  return {
    placement,
    maxHeight: Math.round(Math.max(input.minHeight, capped)),
  };
}
