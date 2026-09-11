import { DEFAULT_RP_ID, getRpId } from "./appConfig.ts";
import type { DifficultyMode } from "./types.ts";

/**
 * Single source of truth for the share metadata every page emits.
 *
 * Link unfurlers (Discord, Slack, WhatsApp, iMessage, X) read the document
 * head and nothing else, so the copy below is the only thing a reader sees
 * before deciding whether to open the link. Defaults render from `_app.tsx`;
 * a route overrides any individual tag by rendering the same `name`/`property`
 * inside Fresh's `<Head>`.
 */

/** Used in titles and as `og:site_name`; matches the lowercase product name. */
export const SITE_NAME = "fruiz";

/** The wordmark in the page header, and on the share image. */
export const SITE_WORDMARK = "Musical quiz";

export const SITE_TAGLINE = "Do you know where the music is from?";

export const SITE_TITLE = `${SITE_NAME} - musical quiz`;

/**
 * Leads with the tagline because that is the hook, and an unfurled card gives
 * a reader one line before they decide whether to click.
 */
export const SITE_DESCRIPTION =
  `${SITE_TAGLINE} Identify films, TV shows and games from 20 short music fragments, then share the quiz with friends.`;

/**
 * Served from `src/static/` by `staticFiles()`. A raster format on purpose:
 * Discord refuses SVG, and 1200x630 is what earns the large embed rather than
 * a thumbnail. Regenerate with the command in specs/13.
 */
export const OG_IMAGE_PATH = "/og.png";
export const OG_IMAGE_WIDTH = "1200";
export const OG_IMAGE_HEIGHT = "630";
export const OG_IMAGE_TYPE = "image/png";
export const OG_IMAGE_ALT = `${SITE_WORDMARK}: ${SITE_TAGLINE}`;

/** The logo's yellow. Discord paints the embed's left accent bar with it. */
export const THEME_COLOR = "#fed402";

/** Every quiz draws the same number of tracks (spec 02). */
export const QUIZ_TRACK_COUNT = 20;

/**
 * Signed-in surfaces. Nothing here should reach a search index or an unfurler:
 * the pages are either personal (a player's collection) or privileged (admin).
 */
export const PRIVATE_PATH_PREFIXES = ["/account", "/admin", "/collection"];

/**
 * The origin a crawler can actually reach.
 *
 * Pure on purpose, so the rule is testable without touching the environment.
 * In production the app has no published ports and sits behind a reverse proxy
 * (see `compose.yaml`), so the request origin is the proxy's plain-HTTP hop at
 * best and the internal `http://fruiz:8000` at worst. Neither is fetchable, and
 * an `og:image` a crawler cannot fetch produces no card at all. The deployed
 * domain is configured exactly once, as `FRUIZ_RP_ID`, so that is what the
 * canonical origin is built from; the request origin is the dev fallback.
 */
export function canonicalOriginFrom(
  rpId: string,
  requestOrigin: string,
): string {
  const trimmedRpId = rpId.trim();
  if (trimmedRpId === "" || trimmedRpId === DEFAULT_RP_ID) {
    return requestOrigin;
  }
  return `https://${trimmedRpId}`;
}

export function resolveCanonicalOrigin(requestUrl: URL): string {
  return canonicalOriginFrom(getRpId(), requestUrl.origin);
}

/** Absolute URL for `path`, anchored to the canonical origin. */
export function buildAbsoluteUrl(requestUrl: URL, path: string): string {
  return new URL(path, `${resolveCanonicalOrigin(requestUrl)}/`).href;
}

/** `<page> — fruiz`, or the standalone site title when there is no page name. */
export function buildPageTitle(pageTitle: string | null): string {
  const trimmed = pageTitle?.trim() ?? "";
  return trimmed === "" ? SITE_TITLE : `${trimmed} — ${SITE_NAME}`;
}

export function buildQuizTitle(categoryName: string): string {
  return `${categoryName} quiz`;
}

/**
 * Names the difficulty as well as the category: both are part of quiz identity
 * (spec 02), and difficulty is the thing someone deciding whether to take a
 * challenge actually wants to know.
 */
export function buildQuizDescription(
  categoryName: string,
  difficulty: DifficultyMode,
): string {
  return `${QUIZ_TRACK_COUNT} tracks from ${categoryName}, ${difficulty} mode. ${SITE_TAGLINE}`;
}

/**
 * Prefix match on a path boundary, so `/collections-public` would not be
 * mistaken for the private `/collection`.
 */
export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PATH_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
