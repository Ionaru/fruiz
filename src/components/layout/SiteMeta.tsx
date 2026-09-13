import {
  buildAbsoluteUrl,
  isPrivatePath,
  OG_IMAGE_ALT,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_PATH,
  OG_IMAGE_TYPE,
  OG_IMAGE_WIDTH,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_WORDMARK,
  THEME_COLOR,
} from "../../lib/siteMeta.ts";

export interface SiteMetaProps {
  /** The current request URL; only its pathname is trusted, not its origin. */
  url: URL;
}

/**
 * Every tag a link unfurler reads, with site-wide defaults.
 *
 * Rendered from `_app.tsx` inside `<head>`. Fresh keys head tags by name (and
 * by `property` for `<meta>`, ignoring `content`), so a route rendering the
 * same tag inside `<Head>` replaces the default in place rather than appending
 * a duplicate. That is what makes these defaults rather than constants (spec
 * 13). The `twitter:*` pairs cost nothing where they are unused.
 */
export function SiteMeta({ url }: Readonly<SiteMetaProps>) {
  const canonicalUrl = buildAbsoluteUrl(url, url.pathname);
  const imageUrl = buildAbsoluteUrl(url, OG_IMAGE_PATH);

  return (
    <>
      <title>{SITE_TITLE}</title>
      <meta name="description" content={SITE_DESCRIPTION} />
      <meta name="theme-color" content={THEME_COLOR} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={SITE_WORDMARK} />
      <meta property="og:description" content={SITE_DESCRIPTION} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />
      {
        /* Landscape dimensions are what earn the large embed instead of a
          thumbnail, so these two are load-bearing rather than decoration.
          They must keep matching the real file; a test asserts that. */
      }
      <meta property="og:image:width" content={OG_IMAGE_WIDTH} />
      <meta property="og:image:height" content={OG_IMAGE_HEIGHT} />
      <meta property="og:image:type" content={OG_IMAGE_TYPE} />
      <meta property="og:image:alt" content={OG_IMAGE_ALT} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={SITE_WORDMARK} />
      <meta name="twitter:description" content={SITE_DESCRIPTION} />
      <meta name="twitter:image" content={imageUrl} />

      {isPrivatePath(url.pathname) && (
        <meta name="robots" content="noindex, nofollow" />
      )}
    </>
  );
}
