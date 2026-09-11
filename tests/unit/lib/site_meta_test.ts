import { assertEquals, assertStringIncludes } from "@std/assert";

import {
  buildAbsoluteUrl,
  buildPageTitle,
  buildQuizDescription,
  buildQuizTitle,
  canonicalOriginFrom,
  isPrivatePath,
  OG_IMAGE_PATH,
  resolveCanonicalOrigin,
  SITE_TAGLINE,
  SITE_TITLE,
} from "../../../src/lib/siteMeta.ts";

/** Runs `body` with `FRUIZ_RP_ID` set, restoring whatever was there before. */
function withRpId(rpId: string | null, body: () => void) {
  const previous = Deno.env.get("FRUIZ_RP_ID");
  if (rpId === null) {
    Deno.env.delete("FRUIZ_RP_ID");
  } else {
    Deno.env.set("FRUIZ_RP_ID", rpId);
  }
  try {
    body();
  } finally {
    if (previous === undefined) {
      Deno.env.delete("FRUIZ_RP_ID");
    } else {
      Deno.env.set("FRUIZ_RP_ID", previous);
    }
  }
}

Deno.test("a configured RP ID wins over the proxied request origin", () => {
  // The container is reached as http://fruiz:8000 behind the reverse proxy;
  // that origin is unreachable for an unfurler, so it must not survive.
  assertEquals(
    canonicalOriginFrom("fruiz.example.com", "http://fruiz:8000"),
    "https://fruiz.example.com",
  );
});

Deno.test("the canonical origin is always https when derived", () => {
  assertStringIncludes(
    canonicalOriginFrom("fruiz.example.com", "http://fruiz.example.com"),
    "https://",
  );
});

Deno.test("the dev RP ID falls back to the request origin", () => {
  assertEquals(
    canonicalOriginFrom("localhost", "http://localhost:5173"),
    "http://localhost:5173",
  );
});

Deno.test("an unset or blank RP ID falls back to the request origin", () => {
  assertEquals(
    canonicalOriginFrom("", "http://localhost:5173"),
    "http://localhost:5173",
  );
  assertEquals(
    canonicalOriginFrom("   ", "http://localhost:5173"),
    "http://localhost:5173",
  );
});

Deno.test("surrounding whitespace in the RP ID is ignored", () => {
  assertEquals(
    canonicalOriginFrom("  fruiz.example.com  ", "http://fruiz:8000"),
    "https://fruiz.example.com",
  );
});

Deno.test("resolveCanonicalOrigin reads FRUIZ_RP_ID", () => {
  withRpId("fruiz.example.com", () => {
    assertEquals(
      resolveCanonicalOrigin(new URL("http://fruiz:8000/quiz/disney/eA2K")),
      "https://fruiz.example.com",
    );
  });
});

Deno.test("resolveCanonicalOrigin falls back when FRUIZ_RP_ID is unset", () => {
  withRpId(null, () => {
    assertEquals(
      resolveCanonicalOrigin(new URL("http://localhost:5173/")),
      "http://localhost:5173",
    );
  });
});

Deno.test("absolute URLs anchor to the canonical origin", () => {
  withRpId("fruiz.example.com", () => {
    const requestUrl = new URL("http://fruiz:8000/quiz/disney/eA2K?limit=3");
    assertEquals(
      buildAbsoluteUrl(requestUrl, OG_IMAGE_PATH),
      "https://fruiz.example.com/og.png",
    );
    assertEquals(
      buildAbsoluteUrl(requestUrl, requestUrl.pathname),
      "https://fruiz.example.com/quiz/disney/eA2K",
    );
  });
});

Deno.test("absolute URLs do not double the separating slash", () => {
  withRpId("fruiz.example.com", () => {
    assertEquals(
      buildAbsoluteUrl(new URL("http://fruiz:8000/"), "/"),
      "https://fruiz.example.com/",
    );
  });
});

Deno.test("a page title carries the site name; a blank one does not", () => {
  assertEquals(buildPageTitle("Disney quiz"), "Disney quiz — fruiz");
  assertEquals(buildPageTitle(null), SITE_TITLE);
  assertEquals(buildPageTitle("   "), SITE_TITLE);
});

Deno.test("the quiz card names the category, the count and the difficulty", () => {
  assertEquals(buildQuizTitle("Disney"), "Disney quiz");
  assertEquals(
    buildQuizDescription("Disney", "hard"),
    `20 tracks from Disney, hard mode. ${SITE_TAGLINE}`,
  );
  assertEquals(
    buildQuizDescription("Studio Ghibli", "easy"),
    `20 tracks from Studio Ghibli, easy mode. ${SITE_TAGLINE}`,
  );
});

Deno.test("private paths are matched on a path boundary", () => {
  assertEquals(isPrivatePath("/account"), true);
  assertEquals(isPrivatePath("/account/login"), true);
  assertEquals(isPrivatePath("/admin/tracks/new"), true);
  assertEquals(isPrivatePath("/collection"), true);

  assertEquals(isPrivatePath("/"), false);
  assertEquals(isPrivatePath("/quiz/disney/eA2K"), false);
  assertEquals(isPrivatePath("/suggest"), false);
  // A sibling path that merely starts with the same letters is public.
  assertEquals(isPrivatePath("/collections-public"), false);
  assertEquals(isPrivatePath("/administrivia"), false);
});
