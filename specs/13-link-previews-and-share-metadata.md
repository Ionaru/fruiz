# 13 — Link previews and share metadata

> Owns the document `<head>` tags that decide what a shared fruiz link looks
> like when it is unfurled in Discord, Slack, WhatsApp, iMessage or X, plus the
> static share image and the canonical origin those tags are built from.

## Purpose

A player finishing a quiz copies a challenge message ("I scored 15/20 on this
quiz, can you beat me? <url>", see `04-quiz-progress-and-replay.md`) and pastes
it into a chat app. Everything the recipient sees before clicking comes from
this subsystem.

This subsystem owns:

- The default head tags every page emits, and how a route overrides one.
- Resolution of the canonical, publicly reachable origin.
- The static share image (`src/static/og.png`) and how it is regenerated.
- Which paths are marked `noindex`.

It does **not** own:

- Quiz identity or the shape of the quiz URL, which belong to
  `02-quiz-identity-and-selection.md`. Metadata is derived from quiz identity
  and MUST never feed back into it (Principle I).
- The challenge share text, which belongs to `04-quiz-progress-and-replay.md`
  (`src/lib/challengeShare.ts`).
- Auth gating. `noindex` is indexing hygiene, not an access control; the real
  boundary is the session middleware
  (`08-admin-authentication-and-passkeys.md`).

## Behavior

### Defaults, and overriding one

`SiteMeta` renders the full default tag set from inside `_app.tsx`'s `<head>`. A
route overrides an individual tag by rendering the same tag inside Fresh's
`<Head>`.

The mechanism, verified against `@fresh/core` 2.3.3, is worth stating because
the whole design leans on it:

1. Fresh renders in two passes. The route tree renders first, then the app
   wrapper with the route's HTML injected. Route `<Head>` children are therefore
   collected before `_app.tsx`'s `<head>` renders.
2. Fresh keys each `title` / `meta` / `link` / `script` / `style` / `base` /
   `noscript` / `template` by the explicit `key` prop, else the literal
   `"title"` for `<title>`, else the tag name plus each remaining prop value in
   sorted-key order, **skipping `children`, `nonce`, `ref`, `content` on `meta`,
   and `href` on `link`**.
3. A tag inside `<Head>` is stored under that key and renders nothing in place.
   A tag inside `<head>` looks its key up; a stored version replaces it in place
   and is consumed. Anything unconsumed is appended after `<head>`.

Given the quiz route renders `<meta property="og:title">` inside `<Head>`, When
the page is served, Then the emitted `<head>` contains exactly one `og:title`,
carrying the quiz value, in the position of the default.

**The `og:` / `twitter:` spelling is load-bearing.** Because the key is built
from attribute _values_ and not attribute names, `name="og:title"` and
`property="og:title"` produce the same key. `og:*` MUST always use `property=`
and `twitter:*` MUST always use `name=`; mixing them lets an override silently
emit the spelling the target platform ignores. A test enforces this.

`deno.json` lists these tags in `jsxPrecompileSkipElements`, which is what keeps
them real vnodes rather than precompiled string chunks. Removing an entry would
silently break head overriding.

### The canonical origin

Given `FRUIZ_RP_ID` is set to the deployed domain, When any page renders, Then
`og:url`, `og:image`, `twitter:image` and `rel="canonical"` are absolute
`https://` URLs on that domain, regardless of the request's own origin.

Given `FRUIZ_RP_ID` is unset, blank, or the `localhost` default, Then those URLs
fall back to the request origin, so `deno task dev` works.

This exists because the deployment has no published ports and sits behind an
external reverse proxy, reached as `http://fruiz:8000` (`compose.yaml`). Deno
builds the request URL from the forwarded `Host` over a plain HTTP hop, so the
request origin is `http://` at best and the internal hostname at worst. An
unfurler that cannot fetch `og:image` renders no image at all.

Query strings and fragments are dropped: `/?limit=3` and
`/quiz/disney/eA2K?limit=3` both canonicalise to the bare path. Replay limits
are player-local preferences, not quiz identity (Principle I), so they must not
vary the card.

### Per-page copy

| Page               | `<title>`                 | `og:title`        | Description                                               |
| ------------------ | ------------------------- | ----------------- | --------------------------------------------------------- |
| Default (any page) | `fruiz - musical quiz`    | `Musical quiz`    | `SITE_DESCRIPTION`, which leads with the tagline          |
| Quiz               | `<Category> quiz — fruiz` | `<Category> quiz` | `20 tracks from <Category>, <difficulty> mode. <tagline>` |

The home page overrides nothing: the defaults _are_ its card. `og:title` omits
the brand because `og:site_name` renders "fruiz" directly above it.

The quiz description names the difficulty as well as the category. Both are part
of quiz identity, and difficulty is what a challenge recipient wants to know
before accepting.

### Indexing

Given a path under `/account`, `/admin` or `/collection`, Then
`<meta name="robots" content="noindex, nofollow">` is emitted.

The prefix match is on a path boundary, so a future `/collections-public` would
stay public. This is derived from the pathname in one place rather than added to
each route file.

### The share image

`og:image` is `/og.png`: a static 1200x630 PNG served from `src/static/` by
`staticFiles()`.

- **Raster, not SVG.** Discord does not render SVG in an embed, so the existing
  `logo.svg` cannot be used directly.
- **1200x630 (1.91:1).** Landscape dimensions declared through `og:image:width`
  / `og:image:height` are what earn the large embed rather than a small
  thumbnail. The declared values and the real file MUST agree; a test reads the
  PNG's IHDR chunk to enforce it.
- The card keeps its content inside a generous margin, because clients crop the
  1.91:1 frame differently and some re-crop towards square on mobile.

Regenerate after a branding change:

```
deno task og:render
```

`tools/render_og_card.ts` drives a headless Chrome or Chromium over the DevTools
Protocol and screenshots `tools/og_card.html`. It sets the viewport explicitly
on purpose: Chrome's `--screenshot` flag sizes its canvas from `--window-size`
but lays the page out in the window's smaller content area, which leaves a blank
strip along the bottom of the image. The browser is found via `--chrome <path>`,
then `CHROME_PATH`, then `PATH`. `tools/og_card.html` inlines a copy of
`src/static/logo.svg`; re-copy it when the logo changes.

## Data model

No tables. Every string is a constant in `src/lib/siteMeta.ts`. The quiz card
reads `categories.name` and the decoded `difficulty` (see
`02-quiz-identity-and-selection.md`); neither is written back.

`PRIVATE_PATH_PREFIXES` is the one list that must stay in step with the routes
the session middleware gates.

## Key files

- **Server-only:** [`src/lib/siteMeta.ts`](../src/lib/siteMeta.ts) (constants,
  canonical origin, title and description builders),
  [`src/lib/appConfig.ts`](../src/lib/appConfig.ts) (`getRpId` / `getRpName`,
  shared with the passkey config).
- **Components (SSR):**
  [`src/components/layout/SiteMeta.tsx`](../src/components/layout/SiteMeta.tsx).
- **Routes:** [`src/routes/_app.tsx`](../src/routes/_app.tsx) (renders the
  defaults),
  [`src/routes/quiz/[category]/[slug]/index.tsx`](../src/routes/quiz/[category]/[slug]/index.tsx)
  (the only route that overrides them).
- **Assets:** [`src/static/og.png`](../src/static/og.png),
  [`tools/og_card.html`](../tools/og_card.html),
  [`tools/render_og_card.ts`](../tools/render_og_card.ts).
- **Tests:**
  [`tests/unit/lib/site_meta_test.ts`](../tests/unit/lib/site_meta_test.ts),
  [`tests/unit/components/site_meta_test.tsx`](../tests/unit/components/site_meta_test.tsx),
  [`tests/integration/routes/share_meta_test.ts`](../tests/integration/routes/share_meta_test.ts).

## Constraints and invariants

- **Principle I — Deterministic quiz identity.** Metadata is derived from the
  quiz path and never influences it. Player-local query parameters MUST NOT
  appear in `og:url` or `rel="canonical"`.
- **Principle II — Server-first data boundaries.** `src/lib/siteMeta.ts` reads
  `Deno.env`, so it MUST be imported only from `src/routes/` and
  `src/components/`, never from `src/islands/`.
- **Principle VII — Components are SSR-only.** `SiteMeta` renders markup and
  nothing else: no hooks, no signals, no browser APIs.
- Every user-facing share string lives in `src/lib/siteMeta.ts`. A literal copy
  in a route is how the page and its card drift apart; a test guards this.
- `og:*` uses `property=`; `twitter:*` uses `name=`.
- `OG_IMAGE_WIDTH` / `OG_IMAGE_HEIGHT` equal the real dimensions of
  `src/static/og.png`.

## Verification approach

**Unit** (`tests/unit/lib/site_meta_test.ts`): canonical origin resolution for a
configured RP ID, the `localhost` default, blank and whitespace values; absolute
URL building; title, quiz title and quiz description copy; private-path boundary
matching.

**Component** (`tests/unit/components/site_meta_test.tsx`): renders `SiteMeta`
with `preact-render-to-string` and asserts the full tag set is present, that
`og:image` is absolute HTTPS on the canonical origin rather than the proxied
request origin, that the query string is dropped, that private paths get
`noindex` and public ones do not, that `og:`/`twitter:` spellings are not mixed,
and that nothing is emitted twice.

**Integration** (`tests/integration/routes/share_meta_test.ts`): reads
`src/static/og.png` and asserts the PNG signature and IHDR dimensions match the
declared constants and that the file stays well inside the size unfurlers
accept; scans `src/routes/` (comments stripped) for any route building a share
URL from the request origin, or hardcoding the tagline.

**Manual.** With `FRUIZ_RP_ID=fruiz.example.com deno task dev`:

```
curl -s http://localhost:5173/quiz/<category>/<slug>
```

Read the `<head>`. Every tag must appear exactly once, the quiz values must have
replaced the defaults in place rather than been appended, and every URL must be
`https://fruiz.example.com/...` even though the request was to localhost. A
duplicated `og:title` means the Fresh override mechanism has changed; see the
risk below.

**End to end.** An unfurler cannot reach localhost, so confirming a real card
needs a deployed origin. Discord caches embeds per URL, so re-test with a fresh
URL or a throwaway query after a change.

## Open questions and known risks

- **Risk: `FRUIZ_RP_ID` unset in production is silent.** The card then points at
  an origin no unfurler can fetch, and nothing fails loudly. This is the same
  fail-open class `README.md` already documents for passkeys and secure cookies;
  verify with `docker compose config | grep FRUIZ_RP_ID` after a deploy.
- **Open question: RP ID as a registrable suffix.** WebAuthn permits an RP ID
  that is a parent of the site origin (`example.com` serving `www.example.com`).
  The canonical origin would then be wrong. No deployment does this today.
  `canonicalOriginFrom` is pure and has a single env-reading caller, so
  introducing an explicit `FRUIZ_PUBLIC_ORIGIN` later is a change in one
  function.
- **Risk: the override mechanism is Fresh-internal.** `deno task update` could
  change the key algorithm. The failure mode is quiet rather than loud:
  duplicated tags, and most parsers take the first occurrence, so a quiz link
  would degrade to the generic site card instead of breaking visibly. The manual
  duplicate check above is what catches it.
- **Risk: the logo's notes are the card's own background colour.** The musical
  notes and speaker rings in `logo.svg` are filled `#222a31`, the same hex as
  the card ground. Where a note overhangs the speaker it would be painted the
  colour it sits on and disappear. The warm pool behind the logo in
  `tools/og_card.html` is what separates them; toning it down silently costs the
  notes. A future card that moves the logo off that pool needs another answer,
  such as lifting the ground colour or a light halo on the logo.
- **Risk: `theme-color` is not confined to link previews.** It also colours the
  address bar on Android Chrome, so the value is a site-wide visual choice, not
  only a Discord one.
- **Open question: per-quiz share images.** Tracked in
  [`90-roadmap.md`](./90-roadmap.md). The static card covers every route; a
  per-quiz card would only cover `/quiz/*` and would need a rasteriser, a
  validated endpoint and a bounded cache.
