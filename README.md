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
data/               SQLite database and uploaded audio (gitignored, runtime-created)
.agents/skills/     Deno / Fresh skills for AI agents
AGENTS.md           Canonical implementation standards
CLAUDE.md           Claude Code session entry hints
compose.yaml        Docker Compose stack for container deployment
Dockerfile          Container image (Deno + ffmpeg)
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

`compose.yaml` reads four more at the compose layer:

| Variable                  | Default                       | Purpose                                                             |
| ------------------------- | ----------------------------- | ------------------------------------------------------------------- |
| `FRUIZ_DATA_VOLUME`       | the `fruiz_data` named volume | Where the database and audio live. Otherwise an absolute host path. |
| `FRUIZ_ENVIRONMENT`       | `development`                 | Reported to SigNoz as `deployment.environment`.                     |
| `FRUIZ_TELEMETRY_NETWORK` | `telemetry`                   | Name of the external Docker network the OTLP collector is on.       |
| `FRUIZ_OTLP_ENDPOINT`     | `http://signoz-ingester:4318` | OTLP endpoint, reached over that network.                           |

The port is not configurable. The service always listens on 8000, both inside
and outside Docker.

In a container these are all read from a `.env` file next to `compose.yaml`.
There is no `.env.example` to copy; the deployment file is short enough to write
by hand, and the two tables above are its documentation:

```dotenv
FRUIZ_RP_ID=fruiz.example.com
FRUIZ_SECURE_COOKIES=1
FRUIZ_ENVIRONMENT=production
```

Everything else has a working default. `FRUIZ_DATA_VOLUME` may be left unset to
use the `fruiz_data` named volume; its only other valid value is an **absolute**
host path. A bare volume name is rejected by Compose as an undefined volume.

**Both of the required variables fail open.** `FRUIZ_RP_ID` and
`FRUIZ_SECURE_COOKIES` are passed straight through from the environment, so when
they are missing Compose does not set them in the container at all and the app
quietly uses its own fallbacks: passkey registration and login break against the
real domain, and session cookies lose `Secure`. Neither trips the healthcheck,
so `/` still returns 200 and the deploy still reports success. Confirm them
against the resolved config rather than the deploy log:

```bash
docker compose config | grep -E 'FRUIZ_RP_ID|FRUIZ_SECURE_COOKIES'
```

A `null` there means the variable is not reaching the container.

## Deployment

`Dockerfile` builds a `denoland/deno:debian` image with `ffmpeg` installed
(required for playback-gain analysis), runs `deno task build`, and serves on
port `8000`. `/app/data` is a volume so the SQLite database and uploaded audio
survive container restarts.

`.github/workflows/cd.yaml` runs `deno audit`, `deno task check` and
`deno task test` on every push and pull request, builds and pushes
`ghcr.io/ionaru/fruiz` on merges to `main`, then deploys over SSH: the checkout
on the server is moved to the built commit, the image is pulled by its short
SHA, and `docker compose up --wait` blocks until the container reports healthy.
On start the compose command runs `deno task db:sync` and
`deno task playback-gain:backfill` before `deno task start`.

## Self-hosting

It is possible to self-host fruiz. It requires Docker with the Compose v2
plugin, and images are published to `ghcr.io/ionaru/fruiz`.

fruiz does not publish a port. It listens on 8000 and expects a reverse proxy in
front of it, reached over a shared Docker network named `edge`.

1. Install [Docker Engine](https://docs.docker.com/engine/install/), which
   includes the Compose v2 plugin.
2. Clone this repository, or
   [download](https://github.com/Ionaru/fruiz/archive/main.zip) and extract it.
3. Create the shared networks, if your reverse proxy and collector have not
   already created them:

   ```bash
   docker network create edge
   docker network create telemetry
   ```

   The Compose file declares both as `external`, so it will **not** create them
   for you and startup fails if either is missing. `edge` carries ingress from
   the reverse proxy; `telemetry` carries OTLP export to the collector and is
   renamed by `FRUIZ_TELEMETRY_NETWORK`.

4. Create a `.env` file next to `compose.yaml`. Three lines are enough; see
   [Configuration](#configuration) for the full set and their defaults:

   ```dotenv
   FRUIZ_RP_ID=fruiz.example.com
   FRUIZ_SECURE_COOKIES=1
   FRUIZ_ENVIRONMENT=production
   ```

   The first two have no failure mode you can see from the outside: with
   `FRUIZ_RP_ID` unset the app falls back to `localhost` and every passkey login
   fails, while the container still reports healthy.

5. Start the service, from the root of the checkout:

   ```bash
   docker compose up -d
   ```

   No flags are needed. `compose.yaml` is at the checkout root, so Compose finds
   it, picks up the `.env` next to it, and takes the project name from the file.

6. Check that it came up:

   ```bash
   docker compose ps
   ```

   The service has a healthcheck, so it reports `healthy` once it is actually
   serving.

The first start is slow. Before opening its port, fruiz applies the database
schema and measures playback gain for every track with `ffmpeg`, which on a cold
cache takes several minutes. Later starts skip files whose size and mtime are
unchanged and are fast.

Point your reverse proxy at `http://fruiz:8000`. Compose registers the service
name as a network alias, so anything else attached to `edge` can resolve it.
With Caddy that is:

```caddyfile
fruiz.example.com {
    reverse_proxy fruiz:8000
}
```

If you would rather not run a reverse proxy, publish the port yourself with an
override file next to the Compose file, `compose.override.yaml`:

```yaml
services:
  fruiz:
    ports:
      - "8000:8000"
```

Run `docker compose config` instead of `up` at any point to print the fully
resolved configuration. That is the quickest way to confirm your networks and
data volume are what you expect.

## Documentation

- [`AGENTS.md`](./AGENTS.md) — canonical implementation standards.
- [`specs/README.md`](./specs/README.md) — subsystem behaviour specs.
- [`CLAUDE.md`](./CLAUDE.md) — Claude Code entry hints and command table.
- [`.agents/skills/`](./.agents/skills/) — Deno / Fresh skills used by AI agents
  working in this repo.
