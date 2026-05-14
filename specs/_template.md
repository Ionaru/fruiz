# NN — <subsystem title>

> One- to two-sentence elevator pitch for the subsystem: what it owns, why it
> exists. Replace this block.

## Purpose

What this subsystem is responsible for, and what it is explicitly **not**
responsible for. State the boundary with adjacent subsystems by referencing
their spec files (e.g. "answer scoring lives in
`05-answer-scoring-and-guess-matching.md`").

## Behavior

The user journeys and behavioral rules the subsystem implements. Use
`Given / When / Then` for testable acceptance scenarios. Cover:

- Happy paths.
- Edge cases (invalid input, missing data, gesture-restricted browsers, expired
  sessions, etc.).
- Redirects / failure paths and what the player sees.
- Any invariants that MUST hold for every request or every render.

## Data model

Domain types, DB tables, and serialization contracts owned by this subsystem.
Reference Drizzle definitions in `src/db/schema.ts` and shared types in
`src/lib/types.ts` rather than restating them; call out the specific fields the
subsystem reads or writes.

## Key files

Bullet list of modules under `src/` (and `tests/` where relevant) that implement
this subsystem. Group by role:

- **Server-only:** `src/lib/...`, `src/db/...`, route handlers
- **Islands (client):** `src/islands/...`
- **Components (SSR):** `src/components/...`
- **Routes:** `src/routes/...`
- **Tests:** `tests/unit/...`, `tests/integration/...`

Every path here MUST exist in the repository at the time the spec is written.

## Constraints and invariants

Project-wide rules that apply with extra force to this subsystem. Cross-link to
the matching principle in `AGENTS.md` (e.g. "see Principle I — Deterministic
quiz identity"). State the _invariant_ in concrete terms ("same
`(seed,
categorySlug, difficulty)` → same ordered 20-track list").

## Verification approach

How a future contributor confirms the subsystem still works:

- Unit tests that cover the rules above.
- Integration tests for routes / persistence / auth-touching paths.
- Manual validation steps where automation is impractical (mobile UX, audio
  gesture flows, passkey ceremonies). Be specific — name the route, the device
  type, and what to look for.

## Open questions and known risks

Anything that is unresolved or fragile. Examples: brittle browser-API
dependencies, performance hot paths, known schema migrations still to land,
ambiguous product decisions. Mark each item as either an "open question" (needs
an answer) or a "risk" (needs a mitigation).
