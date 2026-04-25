# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Skills

Skills for Deno can be found under `.agents/skills`.

## Source-of-truth precedence

Authority order (see `AGENTS.md` for full text):

1. `.specify/memory/constitution.md` — product/governance rules
2. Repo-enforced checks (`deno.json`, `.github/workflows/cd.yaml`)
3. `AGENTS.md` — implementation standards
4. Generated guidance (`.specify/templates/*`, etc.)

If generated guidance conflicts with the constitution or tooling, the
constitution wins and stale guidance should be updated.

## Commands

Deno is the runtime and package manager — there is no `npm`/`node_modules`
workflow.

| Task                                | Command                                           |
| ----------------------------------- | ------------------------------------------------- |
| Dev server (Vite + Fresh)           | `deno task dev`                                   |
| Production build                    | `deno task build`                                 |
| Start built app                     | `deno task start`                                 |
| Full check (fmt + lint + typecheck) | `deno task check`                                 |
| Autofix fmt/lint                    | `deno task fix`                                   |
| All tests                           | `deno task test`                                  |
| Single test file                    | `deno test -A tests/unit/lib/guess_match_test.ts` |
| Single test by name                 | `deno test -A --filter "name fragment" tests/`    |
| Apply Drizzle schema to SQLite      | `deno task db:sync`                               |
| Backfill playback gain              | `deno task playback-gain:backfill`                |
| Fresh framework upgrade             | `deno task update`                                |

CI (`.github/workflows/cd.yaml`) runs `deno audit`, `deno task check`, and
`deno task test` (after `mkdir data && deno task db:sync`). Treat
audit/lint/test failures as blocking.

DB lives at `data/quiz.db` (SQLite). Create `data/` before first `db:sync`.
`FRUIZ_DEBUG=true` enables Drizzle query logging.

## Stack

Deno · Fresh 2.x · TypeScript · Preact + `@preact/signals` · Tailwind CSS 4 ·
Drizzle ORM on SQLite (`drizzle-orm/node-sqlite`) · Vite via
`@fresh/plugin-vite` · WebAuthn via `@simplewebauthn/server|browser`.

Fresh app entry is `src/main.ts` (wires `staticFiles()` + `fsRoutes()`). Vite
root is `src/`, build output `_fresh/`.

## Hard rules (constitution + AGENTS.md)

These are enforced by review, not tooling — violating them breaks the
architecture.

**Composition / import direction:**

| Parent            | May import                              |
| ----------------- | --------------------------------------- |
| `src/routes/`     | `src/components/`, `src/islands/`       |
| `src/islands/`    | `src/components/`, other `src/islands/` |
| `src/components/` | other `src/components/` only            |

`src/components/` MUST NEVER import from `src/islands/`. Components are SSR-only
— no event handlers requiring hydration, no `window`/`document`, no client
state.

**Signals, not hooks.** Islands use `@preact/signals` only. Do NOT import
`preact/hooks` or use `useState`/`useEffect`/`useRef`/`useMemo`/`useCallback` in
app code. Treat this as a hard ban, including in new code mirrored from
elsewhere.

**Server-only code** (DB, auth, quiz selection, passkey verification) lives
under `src/db/`, `src/lib/`, and route `handler` functions. It must never move
into islands or client bundles.

**Quiz identity is deterministic and path-encoded.**
`selectTracksForQuiz(identity)` in `src/lib/selectTracks.ts` must be pure and
side-effect free: same `(seed, categoryId, difficulty)` → same ordered 20-track
list. Player-local preferences (e.g. `replayLimit`) are query params /
localStorage and MUST NOT influence selection. See `src/lib/slug.ts` for
difficulty-char + base-62 seed encoding (`e`/`h`/`m` prefix).

**Admin auth is passkey-only.** All `/admin/*` routes require a validated
session (see `src/middlewares/session.ts`, `src/lib/adminSession.ts`,
`src/lib/auth.ts`). Never introduce passwords. Preserve challenge verification,
credential counter increments, and `HttpOnly`/`Secure`/SameSite session cookies.
Destructive admin ops require explicit confirmation.

**Naming.** Descriptive identifiers required; single-letter variables/parameters
are disallowed except `_` for intentionally unused bindings (lint rules include
`no-non-null-assertion`, `eqeqeq` on top of the Fresh/JSX/recommended tags).

**Mobile-first.** Player UI is designed for phone screens first. Touch-friendly,
no hover-only interactions, respect browser gesture requirements for audio (no
autoplay tricks).

## Request lifecycle

1. `src/routes/_middleware.ts` applies `sessionMiddleware` then
   `loggerMiddleware`.
2. `sessionMiddleware` (`src/middlewares/session.ts`) reads the session cookie,
   hydrates `ctx.state.session` (`{ id, user, data }`), skips DB load for
   static/asset paths, touches expiry, and diff-persists `data` back to
   `sessions.data` (JSON) if the handler mutated it.
3. `ctx.state` type is `State` from `src/utils.ts`; use the exported
   `define = createDefine<State>()` when writing handlers/middleware.
4. Route handlers query via Drizzle and pass minimal serialized props to the
   page component. The client receives only the active quiz payload,
   category-scoped title suggestions, and hydration state.

## Data access

- Prefer the Drizzle relational query API (`db.query.<table>.findFirst|findMany`
  with `where`/`orderBy`/`columns`/nested `with`). See `src/db/relations.ts`.
- Fall back to `db.select` / the SQL query builder for aggregates,
  `selectDistinct`, non-relational joins, and `sql` fragments.
- Reuse shared query helpers from `src/lib/adminReads.ts` etc. rather than
  duplicating reads across call sites.
- `src/db/db.ts` exports the singleton `db` instance and `DB` type; driver is
  `drizzle-orm/node-sqlite`.

## Verification gates

Before calling work complete:

- `deno fmt --check` (or `deno task check` which bundles fmt + lint + typecheck)
- `deno check` on touched code
- `deno task test` for affected logic/routes/auth/persistence
- Pure deterministic logic → unit tests; route/auth/persistence → integration
  tests or a documented manual validation plan; mobile-facing changes → explicit
  mobile validation evidence.

## Specify workflow

Feature work uses the `.specify/` flow: `specs/<NNN-slug>/` holds spec, plan,
and tasks. Every plan MUST include a constitution check covering deterministic
identity, server/client boundaries, components/islands split,
`@preact/signals`-only reactivity, code-quality principles, and Deno quality
gates. Exceptions go in a complexity/risk section with justification.

## Reference docs

- `docs/ARCHITECTURE.md` — full technical architecture (project structure, data
  model, core modules, routing, auth, performance).
- `docs/DESIGN.md` — product/game design.
- `docs/ROADMAP.md` — upcoming work.
- `AGENTS.md` — day-to-day implementation standards.
- `.specify/memory/constitution.md` — canonical rules (v1.2.2).
