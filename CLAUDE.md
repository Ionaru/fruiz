# CLAUDE.md

This file is the Claude Code entry point for the fruiz repository.

- Canonical implementation standards: [`AGENTS.md`](./AGENTS.md).
- Subsystem behavior: [`specs/`](./specs/) (start at
  [`specs/README.md`](./specs/README.md)).
- Deno / Fresh skills: [`.agents/skills/`](./.agents/skills/).

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
`deno task test` (after `mkdir data && deno task db:sync`). Treat audit / lint /
test failures as blocking.

## Stack

Deno · Fresh · TypeScript · Preact + `@preact/signals` · Tailwind CSS · Drizzle
ORM on SQLite (`drizzle-orm/node-sqlite`) · Vite via `@fresh/plugin-vite` ·
WebAuthn via `@simplewebauthn/server|browser`.

## Database

DB lives at `data/quiz.db` (SQLite). Create `data/` before the first
`deno task db:sync`. `FRUIZ_DEBUG=true` enables Drizzle query logging.

## Rules

See [`AGENTS.md`](./AGENTS.md) for the canonical standards (composition rules,
signals-only client reactivity, server-first boundaries, passkey auth,
verification gates, code-quality principles). The subsystem specs under
[`specs/`](./specs/) describe how each feature works in detail.
