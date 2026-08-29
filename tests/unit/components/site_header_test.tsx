import {
  assert,
  assertEquals,
  assertFalse,
  assertStringIncludes,
} from "@std/assert";
import { render } from "preact-render-to-string";
import { SiteHeader } from "../../../src/components/layout/SiteHeader.tsx";
import type { AuthUserSnapshot } from "../../../src/utils.ts";

const player: AuthUserSnapshot = {
  id: "user-1",
  username: "player",
  admin: false,
};

const admin: AuthUserSnapshot = { id: "user-2", username: "boss", admin: true };

function markup(user: AuthUserSnapshot | null, currentPath: string): string {
  return render(<SiteHeader user={user} currentPath={currentPath} />);
}

function hasDestination(html: string, href: string): boolean {
  return html.includes(`href="${href}"`);
}

/** Classes captured by `pattern`, or an empty list when it matches nothing. */
function classesFrom(html: string, pattern: RegExp): string[] {
  return html.match(pattern)?.[1]?.split(" ") ?? [];
}

/** The row that holds the wordmark and, on the home page, the tagline. */
const brandRow = /<div[^>]*class="([^"]*)"[^>]*><h1/;
const wordmark = /<h1[^>]*class="([^"]*)"/;
const tagline = /<p[^>]*class="([^"]*)"[^>]*>Do you know where/;
const taglineTag = /<p[^>]*>Do you know where/;

/** Hrefs of the header's destination links, in render order. */
function destinations(html: string): string[] {
  const nav = html.match(/<nav\b[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";
  return [...nav.matchAll(/<a\s[^>]*href="([^"]*)"/g)].map(
    (match) => match[1] ?? "",
  );
}

Deno.test("guest sees only the sign-in destination", () => {
  const html = markup(null, "/");
  assertStringIncludes(html, "Sign in");
  assert(hasDestination(html, "/account"));
  assertFalse(hasDestination(html, "/collection"));
  assertFalse(hasDestination(html, "/admin"));
});

Deno.test("signed-in player sees collection and account, never admin", () => {
  const html = markup(player, "/");
  assert(hasDestination(html, "/collection"));
  assert(hasDestination(html, "/account"));
  assertFalse(hasDestination(html, "/admin"));
});

Deno.test("admin also sees the admin destination", () => {
  const html = markup(admin, "/");
  assert(hasDestination(html, "/collection"));
  assert(hasDestination(html, "/admin"));
  assert(hasDestination(html, "/account"));
});

Deno.test("the wordmark is the page heading only on the home page", () => {
  assertStringIncludes(markup(player, "/"), "<h1");
  const away = markup(player, "/collection");
  assertFalse(away.includes("<h1"));
  assert(hasDestination(away, "/"), "expected a link back to the home page");
});

Deno.test("off the home page the wordmark yields space below the sm breakpoint", () => {
  const away = markup(player, "/collection");
  assertStringIncludes(away, 'class="sr-only sm:not-sr-only');
  assertStringIncludes(
    away,
    "Musical quiz",
    "the wordmark must stay in the accessible name of the home link",
  );
  assertFalse(
    markup(player, "/").includes('class="sr-only sm:not-sr-only sm:text-lg'),
    "the home page wordmark stays visible at every width",
  );
});

Deno.test("the home destination appears on every page but the home page", () => {
  for (const path of ["/collection", "/suggest", "/admin", "/account/login"]) {
    assertStringIncludes(
      markup(player, path),
      '<span class="sr-only">Home</span>',
      `expected a home destination on ${path}`,
    );
  }
  assertFalse(
    markup(player, "/").includes('<span class="sr-only">Home</span>'),
    "expected no home destination on the home page",
  );
});

Deno.test("the tagline is rendered only on the home page", () => {
  assertStringIncludes(
    markup(null, "/"),
    "Do you know where the music is from?",
  );
  assertFalse(
    markup(null, "/collection").includes(
      "Do you know where the music is from?",
    ),
  );
});

/*
 * The wordmark outranks the tagline: the bar must never show the two of them
 * ellipsised side by side, which is what happened while both could shrink. The
 * geometry that enforces it only exists in a browser, so these two tests guard
 * the markup that produces it.
 */

Deno.test("the tagline is shown whole or not at all", () => {
  const html = markup(admin, "/");
  const taglineClasses = classesFrom(html, tagline);
  assert(
    taglineClasses.includes("shrink-0"),
    "the tagline must keep its full width so it can only wrap away as a whole",
  );
  assertFalse(
    taglineClasses.includes("truncate"),
    "the tagline must never be ellipsised",
  );
  assert(
    classesFrom(html, wordmark).includes("truncate"),
    "the wordmark keeps the ellipsis for the narrow screens where it is alone",
  );
});

Deno.test("the brand row hides a tagline that no longer fits", () => {
  const rowClasses = classesFrom(markup(admin, "/"), brandRow);
  for (
    const expected of [
      "flex-wrap",
      "sm:max-h-7",
      "sm:max-h-[1lh]",
      "sm:overflow-hidden",
      "sm:text-lg",
    ]
  ) {
    assert(
      rowClasses.includes(expected),
      `expected the brand row to carry ${expected} so the wrapped tagline is clipped`,
    );
  }
  assertFalse(
    classesFrom(markup(admin, "/"), wordmark).some((className) =>
      className.endsWith("text-base") || className.endsWith("text-lg")
    ),
    "the row owns the type scale so that its `1lh` clamp is one line of the wordmark",
  );
});

Deno.test("a tagline clipped by the row is still announced", () => {
  const opening = markup(admin, "/").match(taglineTag)?.[0] ?? "";
  assertStringIncludes(opening, "<p", "expected the tagline to be rendered");
  assertFalse(
    opening.includes("aria-hidden"),
    "the tagline is real copy at the widths that fit it, so it stays in the accessibility tree",
  );
});

Deno.test("guests lose the sign-in destination on the page it points at", () => {
  const onAccount = markup(null, "/account");
  assertFalse(onAccount.includes("Sign in"));
  assertFalse(
    hasDestination(onAccount, "/account"),
    "the sign-in pill must not link a guest to the page they are on",
  );
  for (
    const path of ["/", "/collection", "/account/login", "/account/register"]
  ) {
    assertStringIncludes(
      markup(null, path),
      "Sign in",
      `expected a sign-in destination on ${path}`,
    );
  }
});

Deno.test("signed-in visitors keep the account destination on the account page", () => {
  assert(hasDestination(markup(player, "/account"), "/account"));
  assert(hasDestination(markup(admin, "/account"), "/account"));
});

Deno.test("home and sign-in are the only destinations that vary between pages", () => {
  // `/account` is excluded: it is where the guest sign-in destination drops
  // out, covered by its own test above.
  const pages = [
    "/collection",
    "/suggest",
    "/admin",
    "/account/login",
    "/account/register",
    "/quiz/nintendo/eABC",
  ];
  for (const user of [null, player, admin]) {
    const away = pages.map((path) => destinations(markup(user, path)));
    const first = away[0];
    assert(first !== undefined, "expected at least one page to compare");
    for (const [index, set] of away.entries()) {
      assertEquals(
        set,
        first,
        `destinations changed on ${pages[index]} for ${
          user?.username ?? "guest"
        }`,
      );
    }
    // The home page renders the same set minus the home destination.
    assertEquals(
      destinations(markup(user, "/")),
      first.filter((href) => href !== "/"),
    );
    assert(first.includes("/"), "expected a home destination away from home");
  }
});

Deno.test("icon-only destinations keep a visually hidden text label", () => {
  const html = markup(admin, "/");
  assertStringIncludes(html, '<span class="sr-only">Admin</span>');
  assertStringIncludes(html, '<span class="sr-only">Account</span>');
  assertStringIncludes(
    html,
    '<span class="sr-only sm:not-sr-only">Collection</span>',
  );
  assertFalse(html.includes("aria-label"));
});
