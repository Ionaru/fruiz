import { assertEquals, assertStringIncludes } from "@std/assert";
import { render } from "preact-render-to-string";

import { SiteMeta } from "../../../src/components/layout/SiteMeta.tsx";
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  THEME_COLOR,
} from "../../../src/lib/siteMeta.ts";

const PUBLIC_ORIGIN = "fruiz.example.com";

/** Renders the tag set as a deployment would, behind the reverse proxy. */
function renderForPath(pathname: string): string {
  const previous = Deno.env.get("FRUIZ_RP_ID");
  Deno.env.set("FRUIZ_RP_ID", PUBLIC_ORIGIN);
  try {
    return render(<SiteMeta url={new URL(`http://fruiz:8000${pathname}`)} />);
  } finally {
    if (previous === undefined) {
      Deno.env.delete("FRUIZ_RP_ID");
    } else {
      Deno.env.set("FRUIZ_RP_ID", previous);
    }
  }
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

Deno.test("every tag a link unfurler reads is present", () => {
  const html = renderForPath("/");
  for (
    const tag of [
      '<meta name="description"',
      `<meta name="theme-color" content="${THEME_COLOR}"`,
      '<link rel="canonical"',
      `<meta property="og:site_name" content="${SITE_NAME}"`,
      '<meta property="og:type" content="website"',
      '<meta property="og:title"',
      '<meta property="og:description"',
      '<meta property="og:url"',
      '<meta property="og:image"',
      `<meta property="og:image:width" content="${OG_IMAGE_WIDTH}"`,
      `<meta property="og:image:height" content="${OG_IMAGE_HEIGHT}"`,
      '<meta property="og:image:type" content="image/png"',
      '<meta property="og:image:alt"',
      '<meta name="twitter:card" content="summary_large_image"',
      '<meta name="twitter:title"',
      '<meta name="twitter:description"',
      '<meta name="twitter:image"',
    ]
  ) {
    assertStringIncludes(html, tag);
  }
});

Deno.test("og:image is absolute and https, not the proxied request origin", () => {
  const html = renderForPath("/quiz/disney/eA2K");
  assertStringIncludes(
    html,
    `<meta property="og:image" content="https://${PUBLIC_ORIGIN}/og.png"`,
  );
  assertStringIncludes(
    html,
    `<meta name="twitter:image" content="https://${PUBLIC_ORIGIN}/og.png"`,
  );
  assertEquals(html.includes("fruiz:8000"), false);
});

Deno.test("og:url and the canonical link point at the current page, without the query", () => {
  const previous = Deno.env.get("FRUIZ_RP_ID");
  Deno.env.set("FRUIZ_RP_ID", PUBLIC_ORIGIN);
  try {
    const html = render(
      <SiteMeta url={new URL("http://fruiz:8000/quiz/disney/eA2K?limit=3")} />,
    );
    const expected = `https://${PUBLIC_ORIGIN}/quiz/disney/eA2K`;
    assertStringIncludes(html, `<meta property="og:url" content="${expected}"`);
    assertStringIncludes(html, `<link rel="canonical" href="${expected}"`);
    assertEquals(html.includes("limit=3"), false);
  } finally {
    if (previous === undefined) {
      Deno.env.delete("FRUIZ_RP_ID");
    } else {
      Deno.env.set("FRUIZ_RP_ID", previous);
    }
  }
});

Deno.test("the default description leads with the tagline", () => {
  const html = renderForPath("/");
  assertStringIncludes(html, SITE_TAGLINE);
  assertEquals(SITE_DESCRIPTION.startsWith(SITE_TAGLINE), true);
});

Deno.test("signed-in surfaces are marked noindex; public ones are not", () => {
  const robots = '<meta name="robots" content="noindex, nofollow"';
  for (
    const path of ["/account", "/account/login", "/admin/tracks", "/collection"]
  ) {
    assertStringIncludes(renderForPath(path), robots);
  }
  for (const path of ["/", "/quiz/disney/eA2K", "/suggest"]) {
    assertEquals(renderForPath(path).includes(robots), false);
  }
});

Deno.test("og:* use property and twitter:* use name", () => {
  // Fresh keys head tags by attribute *value*, not attribute name, so
  // `name="og:title"` and `property="og:title"` collide. Mixing the two would
  // let a route override emit the spelling the other platform ignores.
  const html = renderForPath("/");
  assertEquals(html.includes('name="og:'), false);
  assertEquals(html.includes('property="twitter:'), false);
});

Deno.test("no tag is emitted twice", () => {
  const html = renderForPath("/");
  for (
    const key of [
      'name="description"',
      'property="og:title"',
      'property="og:description"',
      'property="og:image"',
      'property="og:url"',
      'name="twitter:card"',
    ]
  ) {
    assertEquals(countOccurrences(html, key), 1, `duplicate ${key}`);
  }
});
