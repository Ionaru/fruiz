/**
 * The part of the page the on-screen keyboard leaves visible, and the geometry
 * the quiz islands derive from it.
 *
 * On a phone the keyboard covers the bottom of the screen without reflowing the
 * page: under Chrome's default `interactive-widget=resizes-visual`, and under
 * every version of iOS Safari, it shrinks only the *visual* viewport while the
 * layout viewport keeps its full height. So the browser believes content down
 * there is on screen while the keyboard is painted over it, and `scrollIntoView`
 * finds nothing to do. `window.visualViewport` is the only cross-browser signal
 * for the space that is really visible, so everything here works from its
 * numbers instead of from viewport units or `env()` insets.
 *
 * `readVisibleBand` is the one DOM read in this module, kept here so every
 * island measures the band the same way. The planners below it are pure, so the
 * maths can be unit-tested by feeding them measurements.
 */

/** The slice of the layout viewport the user can actually see, in client coordinates. */
export interface VisibleBand {
  /** Distance from the top of the layout viewport (`visualViewport.offsetTop`). */
  top: number;
  /** Visible height; shrinks when the on-screen keyboard opens. */
  height: number;
}

/** An element's vertical extent, in client coordinates. */
export interface AnchorBounds {
  top: number;
  bottom: number;
}

/**
 * Measure the band. Falls back to the full layout viewport where
 * `visualViewport` is missing, which makes every planner here a no-op rather
 * than a source of bad geometry.
 */
export function readVisibleBand(): VisibleBand {
  const viewport = globalThis.visualViewport;
  if (!viewport) {
    return { top: 0, height: document.documentElement.clientHeight };
  }
  return { top: viewport.offsetTop, height: viewport.height };
}

export interface VisibleBandScrollInput {
  band: VisibleBand;
  /** The element that should end up inside the band. */
  bringIntoView: AnchorBounds;
  /** The element that must stay inside the band while getting there. */
  keepInView: AnchorBounds;
  /** Gap kept between either element and the edge of the band. */
  edgeClearance: number;
}

/**
 * How far to scroll the page down so `bringIntoView` clears the bottom of the
 * visible band, without pushing `keepInView` off the top of it. Zero means
 * leave the page alone: either nothing is hidden, or freeing the one element
 * would only hide the other.
 *
 * The clamp is what makes this safe to run while the player is typing. The
 * field being typed into is the element that must never move out of sight, so
 * the nudge stops at the point where its top would reach the top of the band,
 * even when that leaves part of the target still covered.
 */
export function planVisibleBandScroll(input: VisibleBandScrollInput): number {
  const bandBottom = input.band.top + input.band.height;
  const hiddenBelow = input.bringIntoView.bottom + input.edgeClearance -
    bandBottom;
  if (hiddenBelow <= 0) return 0;
  // Scrolling by `delta` lifts every client rect by `delta`, so this is how far
  // `keepInView` can travel before it is the one out of sight.
  const headroom = input.keepInView.top - input.band.top - input.edgeClearance;
  if (headroom <= 0) return 0;
  return Math.round(Math.min(hiddenBelow, headroom));
}
