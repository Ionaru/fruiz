# Implementation Plan: Musical Quiz App MVP

**Branch**: `001-musical-quiz-app` | **Date**: 2026-03-26 | **Spec**:
`specs/001-musical-quiz-app/spec.md` **Input**: Feature specification from
`/specs/001-musical-quiz-app/spec.md`

## Summary

Build the full Musical Quiz App MVP on top of the existing Fresh 2.x project:
deterministic shareable quiz URLs, a mobile-first player quiz flow with local
progress persistence, and a passkey-protected admin console for track/category
management. The implementation will keep all selection logic, database access,
and auth verification server-side while using hydrated islands only for
interactive playback, answer entry, settings capture, and admin form behavior.

## Technical Context

**Language/Version**: TypeScript on Deno with Fresh 2.2.x and Preact 10.x\
**Primary Dependencies**: `fresh`, `preact`, `@preact/signals`, `drizzle-orm`,
`@fresh/plugin-vite`, `tailwindcss`, plus a Deno-compatible WebAuthn
verification library during implementation\
**Storage**: SQLite database via `drizzle-orm/node-sqlite` (`quiz.db`) with
route-driven reads/writes; localStorage for player progress\
**Testing**: `deno fmt --check`, `deno lint`, `deno check`, `deno test` for pure
logic and route behavior, plus manual mobile/passkey validation from
`quickstart.md`\
**Target Platform**: Mobile-first web app for modern browsers; admin flows
require browsers/devices with WebAuthn/passkey support\
**Project Type**: Fresh SSR web application with client islands\
**Performance Goals**: Keep quiz generation deterministic and server-side, send
only one quiz payload plus category-scoped suggestions to the browser, and fetch
audio on demand instead of bundling or preloading the full quiz\
**Constraints**: Quiz identity must remain path-only, replay limit must stay
player-local, selection/auth logic must remain server-only, audio playback must
be gesture-safe on mobile, and destructive admin actions need confirmation\
**Scale/Scope**: MVP public quiz experience plus internal admin console, seeded
with at least one category containing enough tracks for a 20-round quiz

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Deterministic Quiz Identity**: Pass. Quiz identity is defined by
  `/quiz/{category}/{difficulty-char}{seed}` only. `lib/slug.ts`, `lib/prng.ts`,
  and `lib/selectTracks.ts` will encode/decode and reproduce the same ordered
  quiz for the same inputs. Replay limits and progress stay outside identity.
- **Server-First Boundaries**: Pass. Route handlers and server helpers will own
  category lookup, slug validation, deterministic selection, title retrieval,
  database mutations, passkey verification, and session issuance. Islands are
  limited to playback UI, answer selection, quiz state transitions, settings
  capture, and optional dynamic admin interactions.
- **Mobile-First Playability**: Pass. The home screen, settings gate, quiz
  overview, active track panel, and results screen are all designed for
  phone-sized layouts with touch-friendly controls, labeled interactions, and
  gesture-triggered playback.
- **Passkey-Secured Administration**: Pass. All `/admin/*` routes remain
  auth-gated; registration/authentication flows are implemented via WebAuthn
  endpoints, signed session cookies, and explicit delete confirmations.
- **Verification Plan**: Pass. Add unit tests for slug encoding/decoding, seed
  generation, normalization, deterministic track selection, and
  category-availability filtering; route/integration tests for quiz redirects,
  handler loading, unavailable category+difficulty combinations, and admin auth
  gating; manual validation for mobile layout, clipboard behavior, replay
  limits, and passkey flows.

## Project Structure

### Documentation (this feature)

```text
specs/001-musical-quiz-app/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── auth-api.md
│   └── quiz-routes.md
└── tasks.md
```

### Source Code (repository root)

```text
assets/
├── styles.css
components/
├── Button.tsx
├── admin/
│   ├── CategoryForm.tsx
│   └── TrackForm.tsx
└── quiz/
   ├── AudioTrackPlayer.tsx
   ├── QuizPlayer.tsx
   └── SettingsGate.tsx
db/
├── config.ts
├── db.ts
├── relations.ts
└── schema.ts
islands/
├── AdminForms.tsx
├── AnswerInput.tsx
├── AudioPlayer.tsx
└── QuizController.tsx
lib/
├── auth.ts
├── normalize.ts
├── prng.ts
├── selectTracks.ts
└── slug.ts
routes/
├── index.tsx
├── admin/
│   ├── index.tsx
│   ├── login.tsx
│   ├── categories/
│   │   ├── index.tsx
│   │   ├── new.tsx
│   │   └── [id].tsx
│   └── tracks/
│      ├── index.tsx
│      ├── new.tsx
│      └── [id].tsx
├── api/
│   ├── auth/
│   │   ├── authenticate.ts
│   │   └── register.ts
│   └── listen/
│      └── [id].ts
└── quiz/
   └── [category]/
      └── [slug]/
         └── index.tsx
static/
tests/
├── integration/
└── unit/
```

**Structure Decision**: Use the existing single Fresh application structure
rather than splitting frontend/backend. Keep server-only logic in `db/`, `lib/`,
and route handlers; server-rendered shell components in `components/`;
interactive islands in `islands/`; and add a lightweight `tests/` tree for
deterministic logic and route coverage. This matches the architecture doc and
the current Deno/Fresh setup while keeping deployment simple.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation             | Why Needed | Simpler Alternative Rejected Because                               |
| --------------------- | ---------- | ------------------------------------------------------------------ |
| None at planning time | N/A        | The current approach satisfies the constitution without exceptions |
