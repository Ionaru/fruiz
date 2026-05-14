# fruiz

A mobile-first, server-rendered web app where players identify films, TV shows,
and games from short music fragments. Quizzes are deterministic and shareable as
URLs, curated through a passkey-protected admin panel.

## What is fruiz

Players pick a category and difficulty, get a 20-track quiz behind a
deterministic URL, and guess each track against a category-scoped autocomplete
list. The same URL always reproduces the same quiz on any device, so links can
be shared for head-to-head play. Optional passkey accounts let players
accumulate a personal collection of correctly-guessed tracks; admins use the
same passkey system to manage the track corpus.

## Features

- **Deterministic shareable quizzes** — `(category, difficulty, code)` in the
  URL produces an identical 20-track ordering on every device.
- **Category-scoped guess matching** — autocomplete and answer matching use
  Unicode-normalized, punctuation-insensitive, case-insensitive comparison
  against the category's full suggestion pool.
- **Per-track loudness normalization** — playback gain is measured with `ffmpeg`
  so every clip plays at a consistent perceived volume.
- **Audio player with visualizer** — Web Audio frequency-bar visualizer centred
  on the play button, with a difficulty-coloured glow (green / yellow / red) and
  keyboard space-bar control.
- **Local progress and replay limit** — players can cap replays per track, skip
  to the next unanswered track, and resume after reload; progress lives in
  `localStorage`, not on the server.
- **Player collections** — authenticated players accumulate correctly-guessed
  tracks per category, with rollups on the collection page and a progress cue
  after each correct answer.
- **Passkey login** — WebAuthn-only authentication for both players and admins;
  no passwords, no email/password flows.
- **Admin content management** — passkey-gated CRUD over tracks and categories,
  audio uploads with collision-safe slugging, per-track playback windowing, and
  a music-folder seeding helper.

## Stack

| Layer     | Choice                                             |
| --------- | -------------------------------------------------- |
| Runtime   | Deno                                               |
| Framework | Fresh (`jsr:@fresh/core`)                          |
| Build     | Vite via `@fresh/plugin-vite`                      |
| Language  | TypeScript (`strict`, `noUncheckedIndexedAccess`)  |
| UI        | Preact + `@preact/signals`                         |
| Styling   | Tailwind CSS (`@tailwindcss/vite`)                 |
| ORM       | Drizzle ORM (`drizzle-orm/node-sqlite`)            |
| Database  | SQLite (`data/quiz.db`)                            |
| Auth      | WebAuthn via `@simplewebauthn/server` + `/browser` |

See [`AGENTS.md`](./AGENTS.md) for the full implementation standards
(composition rules, signals-only client reactivity, server-first boundaries).

## Getting started

Install Deno: https://docs.deno.com/runtime/getting_started/installation

Then, from the repo root:

```sh
mkdir data
deno task db:sync
deno task dev
```

`db:sync` applies the Drizzle schema to `data/quiz.db`. The first run starts
with an empty corpus — log in via passkey at `/account` and use the admin panel
to upload tracks, or seed a music folder with `deno run -A tools/seed-music.ts`.

## Commands

| Task                                | Command                            |
| ----------------------------------- | ---------------------------------- |
| Dev server (Vite + Fresh)           | `deno task dev`                    |
| Production build                    | `deno task build`                  |
| Start built app                     | `deno task start`                  |
| Full check (fmt + lint + typecheck) | `deno task check`                  |
| Autofix fmt + lint                  | `deno task fix`                    |
| All tests                           | `deno task test`                   |
| Apply Drizzle schema to SQLite      | `deno task db:sync`                |
| Backfill playback gain              | `deno task playback-gain:backfill` |
| Fresh framework upgrade             | `deno task update`                 |

## Repo layout

```
src/                Application code (routes, islands, components, db, lib, middlewares)
tests/              Unit and integration tests
specs/              Subsystem behaviour specs (start at specs/README.md)
tools/              CLI utilities (seed-music, playback-gain backfill)
deploy/             Dockerfile and docker-compose for container deployment
data/               SQLite database and uploaded audio (gitignored, runtime-created)
.agents/skills/     Deno / Fresh skills for AI agents
AGENTS.md           Canonical implementation standards
CLAUDE.md           Claude Code session entry hints
deno.json           Deno config — tasks, lint rules, import map
drizzle.config.ts   Drizzle schema migration config
vite.config.ts      Vite build configuration
```

## Configuration

The app reads the following environment variables:

| Variable               | Default        | Purpose                                                        |
| ---------------------- | -------------- | -------------------------------------------------------------- |
| `FRUIZ_DEBUG`          | unset          | Set to `true` to enable Drizzle query logging.                 |
| `FRUIZ_SECURE_COOKIES` | unset          | Set to `1` to mark session cookies `Secure` (non-dev only).    |
| `FRUIZ_RP_ID`          | `localhost`    | WebAuthn Relying Party ID. Set to your deployed domain.        |
| `FRUIZ_RP_NAME`        | `Musical Quiz` | WebAuthn RP display name shown in the passkey prompt.          |
| `FRUIZ_GIT_REVISION`   | unset          | Git SHA injected into the page footer; CI sets this on deploy. |
| `DENO_DEPLOYMENT_ID`   | unset          | Fallback identifier used when `FRUIZ_GIT_REVISION` is unset.   |

`deploy/compose.yaml` additionally honours `FRUIZ_PORT` (default `8000`) and
`FRUIZ_DATA_VOLUME` (default `data`) at the compose layer.

## Deployment

`deploy/Dockerfile` builds a `denoland/deno:debian` image with `ffmpeg`
installed (required for playback-gain analysis), runs `deno task build`, and
serves on port `8000`. `/app/data` is exposed as a volume so the SQLite database
and uploaded audio survive container restarts.

`.github/workflows/cd.yaml` runs `deno audit`, `deno task check`, and
`deno task test` on every push and pull request, builds and pushes
`ghcr.io/ionaru/fruiz/server:latest` on merges to `main`, and SSH-deploys via
`deploy/compose.yaml`. On container start the compose entrypoint runs
`deno task db:sync` and `deno task playback-gain:backfill` before
`deno task start`.

## Documentation

- [`AGENTS.md`](./AGENTS.md) — canonical implementation standards.
- [`specs/README.md`](./specs/README.md) — subsystem behaviour specs.
- [`CLAUDE.md`](./CLAUDE.md) — Claude Code entry hints and command table.
- [`.agents/skills/`](./.agents/skills/) — Deno / Fresh skills used by AI agents
  working in this repo.
