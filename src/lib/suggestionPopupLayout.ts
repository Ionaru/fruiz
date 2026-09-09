/**
 * Geometry for the answer combobox's suggestion popup.
 *
 * On a phone the on-screen keyboard covers the bottom of the screen without
 * reflowing the page: Chrome's default `interactive-widget=resizes-visual`, and
 * every version of iOS Safari, shrink only the *visual* viewport while the
 * layout viewport keeps its full height. So the browser believes an absolutely
 * positioned popup is on screen while the keyboard is painted over it, and
 * `scrollIntoView` finds nothing to do. `window.visualViewport` is the only
 * cross-browser signal for the space that is really visible, so these helpers
 * work from its numbers instead of from viewport units or `env()` insets.
 *
 * Pure and free of DOM access, so it can be unit-tested: the island takes the
 * measurements and applies the result.
 */

/** The slice of the layout viewport the user can actually see, in client coordinates. */
export interface VisibleBand {
  /** Distance from the top of the layout viewport (`visualViewport.offsetTop`). */
  top: number;
  /** Visible height; shrinks when the on-screen keyboard opens. */
  height: number;
}

/** The anchor element's vertical extent, in client coordinates. */
export interface AnchorBounds {
  top: number;
  bottom: number;
}

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
 * Hanging below the anchor is the default: it matches reading order, and on the
 * quiz page it leaves the clip's play button uncovered, which matters because
 * players replay the clip while they scan the titles. The popup flips above only
 * when the room below has dropped under `flipBelowHeight` and the other side is
 * genuinely roomier, which is the case the on-screen keyboard creates. Merely
 * having more room above is not enough to move it.
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
