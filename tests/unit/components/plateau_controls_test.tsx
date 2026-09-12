import { assert, assertEquals, assertFalse } from "@std/assert";
import { render } from "preact-render-to-string";
import { AccountInfo } from "../../../src/components/account/AccountInfo.tsx";
import { AdminCategoryListItem } from "../../../src/components/admin/AdminCategoryListItem.tsx";
import { AdminSuggestionListItem } from "../../../src/components/admin/AdminSuggestionListItem.tsx";
import { Button } from "../../../src/components/Button.tsx";
import { ButtonLink } from "../../../src/components/ui/ButtonLink.tsx";
import { PillLink } from "../../../src/components/ui/PillLink.tsx";
import { PlateauCard } from "../../../src/components/ui/PlateauCard.tsx";
import { SiteHeader } from "../../../src/components/layout/SiteHeader.tsx";

const stylesheet = await Deno.readTextFile(
  new URL("../../../src/assets/styles.css", import.meta.url),
);

/**
 * The hover and pressed relief lives on a selector in `styles.css`, so no
 * rendered component can assert it directly. These tests pin the two halves
 * instead: the selector covers every element a control is built from, and every
 * control carries `plateau` so the selector reaches it.
 */

/** The body of the rule that gives plateau controls their interactive states. */
function interactiveRule(): string {
  const start = stylesheet.indexOf(":is(a, button, label, summary).plateau {");
  assert(start >= 0, "the interactive plateau rule is missing from styles.css");
  const end = stylesheet.indexOf("\n  }", start);
  return stylesheet.slice(start, end);
}

Deno.test("the interactive rule covers links, not just buttons", () => {
  // Half the app's controls are links styled as buttons. Keying the relief on
  // `button` alone is what left the header pills, the account destinations and
  // the sign-in and register buttons with no hover or pressed state at all.
  for (const element of ["a", "button", "label", "summary"]) {
    assert(
      new RegExp(`:is\\([^)]*\\b${element}\\b[^)]*\\)\\.plateau`).test(
        stylesheet,
      ),
      `<${element}> is not covered by the interactive plateau selector`,
    );
  }
});

Deno.test("a plateau control lifts on hover and presses in when held", () => {
  const rule = interactiveRule();
  assert(rule.includes("@variant hover"), "expected a hover state");
  assert(rule.includes("nm-protrude-md"), "hover should lift the surface");
  assert(rule.includes("@variant active"), "expected a pressed state");
  assert(rule.includes("nm-dent-sm"), "pressed should dent the surface");
  assert(rule.includes("cursor-pointer"), "expected a pointer cursor");
});

Deno.test("the shallow tier keeps its own, proportional hover step", () => {
  const start = stylesheet.indexOf(
    ":is(a, button, label, summary).plateau-shallow {",
  );
  assert(start >= 0, "the shallow interactive rule is missing");
  const rule = stylesheet.slice(start, stylesheet.indexOf("\n  }", start));
  assert(rule.includes("@variant hover"));
  assert(
    rule.includes("nm-protrude;"),
    "a shallow control should step one tier up, not to the full hover depth",
  );
  // Pressing a control also hovers it, and the later of two equally specific
  // rules wins. Without its own pressed state the hover override here outranks
  // the shared one above and a shallow control stays lifted while held.
  assert(
    rule.includes("@variant active") && rule.includes("nm-dent-sm"),
    "the shallow tier must restate the pressed state or its hover will outrank it",
  );
});

Deno.test("`hover` is gated on devices that have a pointer", () => {
  // `@variant hover` compiles to `@media (hover: hover)`. A raw `&:hover` would
  // stick the lift to the last thing tapped on a phone, which is the primary
  // target (AGENTS.md III).
  assertFalse(
    /\.plateau[^{]*&:hover/.test(stylesheet),
    "use `@variant hover` so the lift is skipped on touch screens",
  );
});

/** Every `class` attribute in `html`, as sets of class names. */
function classLists(html: string): Set<string>[] {
  return [...html.matchAll(/class="([^"]*)"/g)]
    .map((match) => new Set((match[1] ?? "").split(/\s+/).filter(Boolean)));
}

/** Opening tags in `html` whose class list contains `plateau`. */
function plateauTags(html: string): string[] {
  return [...html.matchAll(/<([a-z]+)\b[^>]*class="([^"]*)"[^>]*>/g)]
    .filter(([, , classes]) => (classes ?? "").split(/\s+/).includes("plateau"))
    .map(([, tag]) => tag ?? "");
}

Deno.test("every control the header renders is a plateau the rule reaches", () => {
  const html = render(
    <SiteHeader
      user={{ id: "user-1", username: "player", admin: true }}
      currentPath="/collection"
    />,
  );
  const destinations = [...html.matchAll(/<a\s[^>]*class="([^"]*)"/g)]
    .map((match) => match[1] ?? "");
  assert(destinations.length > 0, "expected destinations in the header");
  for (const classes of destinations) {
    // The brand link back home is deliberately unstyled; every pill is not.
    if (!classes.includes("rounded-full")) continue;
    assert(
      classes.split(/\s+/).includes("plateau"),
      `a header destination has no plateau surface: ${classes}`,
    );
  }
});

Deno.test("PillLink and ButtonLink are plateau anchors", () => {
  for (
    const html of [
      render(<PillLink href="/collection">Collection</PillLink>),
      render(<ButtonLink href="/collection">My collection</ButtonLink>),
    ]
  ) {
    assertEquals(plateauTags(html), ["a"]);
  }
});

Deno.test("ButtonLink keeps a touch-sized target and a variant tint", () => {
  const classes = classLists(
    render(
      <ButtonLink href="/collection" variant="info" class="flex-1">
        My collection
      </ButtonLink>,
    ),
  )[0] ?? new Set<string>();
  assert(classes.has("min-h-11"), "expected a 44px minimum target");
  assert(classes.has("info"), "expected the variant tint to reach the surface");
  assert(classes.has("flex-1"), "expected caller classes to survive");
  assert(classes.has("no-underline"));
});

Deno.test("a button and its link twin agree on the surface they share", () => {
  // Both have to land on `.plateau` for the one interactive rule to style them
  // the same way; the shapes around it are each control's own business.
  assertEquals(plateauTags(render(<Button>Play</Button>)), ["button"]);
  assertEquals(plateauTags(render(<ButtonLink href="/">Play</ButtonLink>)), [
    "a",
  ]);
});

Deno.test("AccountInfo's destinations are button-shaped links, not bare anchors", () => {
  const html = render(<AccountInfo username="player" />);
  assertEquals(plateauTags(html), ["a", "a"]);
  assert(html.includes('href="/collection"'));
  assert(html.includes('href="/suggest"'));
});

Deno.test("a card that is entirely a link renders as one", () => {
  // The whole card is the target, so the card is the anchor: its padding joins
  // the click target and the surface reports hover and pressed like any other
  // control.
  const category = render(
    <AdminCategoryListItem id="cat-1" name="Nintendo" slug="nintendo" />,
  );
  assertEquals(plateauTags(category), ["a"]);
  assert(category.includes('href="/admin/categories/cat-1"'));

  const suggestion = render(
    <AdminSuggestionListItem
      id="sug-1"
      title="Lost Woods"
      categoryName="Nintendo"
      username="player"
      status="pending"
    />,
  );
  assertEquals(plateauTags(suggestion), ["a"]);
  assert(suggestion.includes('href="/admin/suggestions/sug-1"'));
});

Deno.test("PlateauCard stays a div unless it is given a destination", () => {
  const plain = render(<PlateauCard>Body</PlateauCard>);
  assertEquals(plateauTags(plain), ["div"]);
  assertFalse(plain.includes("<a"));
});
