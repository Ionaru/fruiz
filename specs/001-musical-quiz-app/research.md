# Research: Musical Quiz App MVP

## Decision 1: Keep Fresh SSR with islands as the only app architecture

- **Decision**: Implement the player and admin experiences inside the existing
  Fresh 2.x app, using server-rendered routes and islands only for
  interaction-heavy UI.
- **Rationale**: This matches the current repo setup, the architecture document,
  and the constitution's server-first boundary. It keeps quiz generation, DB
  access, and auth verification off the client while still allowing responsive
  quiz controls.
- **Alternatives considered**:
  - A separate SPA frontend: rejected because it would push more state and
    data-shaping logic into the browser and complicate shareable SSR quiz pages.
  - A second admin-only app: rejected because the MVP does not justify a split
    deployment or duplicate authentication shell.

## Decision 2: Use SQLite + Drizzle for MVP persistence

- **Decision**: Continue using the existing SQLite-backed Drizzle setup in `db/`
  and extend it to include admin users, passkeys, and any missing quiz metadata.
- **Rationale**: The repository already ships with `quiz.db`,
  `drizzle-orm/node-sqlite`, and a seeded local-development workflow. SQLite
  minimizes MVP operational overhead while keeping the schema close to the
  architecture doc.
- **Alternatives considered**:
  - Switching immediately to Postgres: rejected because the current project is
    already wired for SQLite and the MVP requirements do not need a networked
    database yet.
  - Storing quiz data in files: rejected because category membership and admin
    CRUD become more error-prone than relational updates.

## Decision 3: Use path-only quiz identity with player-local replay settings

- **Decision**: Define quiz identity strictly as category slug + difficulty
  char + seed in the path. Store replay limit in query parameters and persist
  progress in localStorage keyed by quiz path.
- **Rationale**: This preserves deterministic shareability, satisfies the
  constitution, and matches both the design and architecture documents.
- **Alternatives considered**:
  - Including replay limit in quiz identity: rejected because replay count is a
    personal accessibility/difficulty preference and should not alter the track
    list.
  - Persisting progress server-side: rejected for MVP because there are no
    player accounts and the design explicitly scopes progress to a device.

## Decision 4: Implement deterministic selection in dedicated server helpers

- **Decision**: Add `lib/prng.ts`, `lib/slug.ts`, `lib/selectTracks.ts`, and
  `lib/normalize.ts` as the core non-UI logic modules.
- **Rationale**: These responsibilities are stable, testable, and naturally
  separated from route rendering. Keeping them isolated makes unit testing
  straightforward and avoids leaking business rules into components.
- **Alternatives considered**:
  - Embedding selection and normalization logic directly in route handlers:
    rejected because it makes deterministic behavior harder to test and reuse.
  - Client-side shuffling/selection: rejected because it violates the
    server-first boundary and makes quiz content easier to inspect.

## Decision 5: Implement passkey auth with route endpoints and signed sessions

- **Decision**: Use `routes/api/auth/register.ts` and
  `routes/api/auth/authenticate.ts` for WebAuthn challenge/verification flows,
  backed by a server-side session helper in `lib/auth.ts`.
- **Rationale**: This aligns with the architecture doc, keeps sensitive
  verification logic on the server, and provides a clear contract for login and
  bootstrap registration.
- **Alternatives considered**:
  - Password-based admin login: rejected by the product design and constitution.
  - Client-only WebAuthn verification: rejected because challenge state,
    credential storage, and session issuance must remain on the server.

## Decision 6: Prefer standard HTML forms for admin CRUD, add islands only where needed

- **Decision**: Build admin pages as server-rendered forms handled by Fresh
  route handlers, with optional islands for multi-select category assignment,
  audio preview, and passkey button interactions.
- **Rationale**: This keeps admin behavior robust without over-hydrating the
  dashboard, and it fits Fresh's SSR model well.
- **Alternatives considered**:
  - Fully client-rendered admin CRUD: rejected because it increases JS payloads
    and duplicates validation logic between client and server.

## Decision 7: Add explicit verification layers by risk

- **Decision**: Use unit tests for deterministic logic, route/integration tests
  for redirects and handler behavior, and manual quickstart validation for
  mobile UX, clipboard flows, replay limits, and passkeys.
- **Rationale**: This is the smallest verification set that still satisfies the
  constitution and the feature's main risks.
- **Alternatives considered**:
  - Manual-only verification: rejected because deterministic selection, slug
    encoding, and answer normalization are easy to regress and easy to automate.
  - Browser-E2E-only verification: rejected for MVP because it adds more setup
    cost than is needed to validate the core server logic.

## Decision 8: Gate category availability by eligible track count

- **Decision**: A category+difficulty combination is available only when it has
  at least 20 eligible tracks. Home-screen options and quiz start validation
  must both enforce this rule.
- **Rationale**: The product requires fixed 20-track quizzes. Preventing
  undersized pools from being selectable preserves deterministic behavior and
  avoids mid-flow failure cases.
- **Alternatives considered**:
  - Allowing short quizzes: rejected because the design specifies a fixed
    20-track quiz.
  - Selecting fewer tracks and padding later: rejected because it creates
    inconsistent game rules and weakens shareable quiz semantics.

## Open Questions

- The current schema stores `fileName` for tracks, while the architecture/design
  docs describe `audioUrl`. Implementation should standardize on one canonical
  field during schema work and document the migration path.
