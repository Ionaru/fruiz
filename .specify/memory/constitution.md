<!--
Sync Impact Report
- Version change: 1.2.0 → 1.2.1
- Modified principles:
  - VII: Clarifying example (replay-limit gate / URL + localStorage prep) MUST be islands.
- Added sections:
  - None
- Removed sections:
  - None
- Templates requiring updates:
  - None (patch clarification only)
- Follow-up TODOs:
  - None
-->

# Musical Quiz App Constitution

## Core Principles

### I. Deterministic Quiz Identity

Every feature that influences which tracks appear in a quiz MUST be encoded in
the shareable quiz path and MUST reproduce the same ordered track list for the
same inputs. Personal preferences such as replay limits MUST remain outside quiz
identity and MUST NOT change quiz selection. Quiz generation logic MUST remain
deterministic, side-effect free, and auditable from route input through final
ordered tracks.

Rationale: shareability is the product's core promise. A copied quiz URL is only
trustworthy if it always recreates the same quiz for every player and device.

### II. Server-First Data Boundaries

Database access, track selection, passkey flows, and all sensitive business
rules MUST run server-side. Client islands MAY manage interaction and local
state, but they MUST receive only the minimum serialized data required for the
active experience. Raw database access, credential material, and quiz selection
logic MUST NEVER move into browser code.

Rationale: the architecture depends on Fresh SSR plus islands to keep secrets,
data access, and bundle size under control while preserving a simple client
runtime.

### III. Mobile-First Playability

Player-facing flows MUST be designed and validated for phone-sized screens
first. New UI work MUST provide touch-friendly controls, avoid hover-only
interactions, preserve keyboard access where applicable, and use semantic HTML
plus labels for interactive elements. Audio interactions MUST respect browser
gesture requirements instead of relying on autoplay.

Rationale: the primary experience is a mobile web quiz. Desktop support is
additive, not the design baseline.

### IV. Passkey-Secured Administration

All `/admin/*` routes and admin mutations MUST require validated passkey-backed
sessions. Passwords MUST NOT be introduced. Authentication changes MUST preserve
challenge verification, credential counter updates, and `HttpOnly`, `Secure`
session cookies. Destructive admin operations MUST present an explicit
confirmation step before data is removed.

Rationale: admin access controls the quiz corpus and must remain
phishing-resistant and operationally safe without expanding the attack surface
with weaker auth patterns.

### V. Verification Is Mandatory

Changes to deterministic logic, URL encoding, normalization, authentication, or
persistence MUST include automated verification proportional to risk. Pure logic
MUST have unit tests. Route handlers, auth flows, and admin CRUD changes MUST
have integration coverage or a documented manual validation plan when automation
is impractical. Specs, plans, and tasks MUST state how compliance with this
constitution will be checked before implementation starts.

Rationale: this project mixes deterministic game logic, browser behavior, and
security boundaries. Regressions are easiest to prevent when verification is
defined up front.

### VI. Maintainable Code & Engineering Discipline

New and changed code MUST follow Clean Code practices (clear naming, small
focused units, straightforward control flow), SOLID design principles where they
apply to TypeScript modules and components, and DRY: duplicated business rules
or selection logic MUST be consolidated when divergence would cause inconsistent
behavior or obscure shared invariants.

Variable, parameter, and function names MUST be descriptive. Single-letter
identifiers MUST NOT be used for variables or parameters; the sole exception is
`_` for intentionally unused bindings where the language or framework convention
requires a binding name.

Rationale: the codebase is shared between server routes, islands, and data
access. Opaque names and duplicated logic raise defect rates and slow safe
changes to quiz identity and auth boundaries.

### VII. Components Are SSR-Only; Islands Own Client Behavior

Modules under `components/` MUST be used exclusively for server-side rendering.
They MAY use TypeScript and Preact to build markup on the server, but they MUST
NOT include **client-side** JavaScript behavior: interactive event handlers that
require hydration, client-side hooks or effects, client-managed state or signals
meant to run in the browser, or browser-only APIs (`window`, `document`, and
similar). Non-island UI in `routes/` MUST follow the same restriction. Only
`islands/` modules (and Fresh-designated island entrypoints) MAY contain code
intended to execute in the browser with those capabilities.

Rationale: Fresh relies on islands for client bundles and interactivity.
Smuggling client behavior into `components/` obscures boundaries, inflates or
misplaces hydration, and weakens the server-first model this app depends on. For
example, UI that updates URL query state or reads `localStorage` before gameplay
(such as a replay-limit gate) MUST ship as an island, not under `components/`.

## Technical Guardrails

The canonical implementation stack is Deno, Fresh 2.x, TypeScript, Preact
islands, `@preact/signals`, Tailwind CSS 4, and Drizzle ORM. Architectural
changes that replace or substantially bypass this stack MUST be justified in the
implementation plan. The `components/` versus `islands/` split in Principle VII
is mandatory for all UI work.

`deno check` MUST pass for the workspace before changes are merged or released.
Formatting MUST match the project’s Deno formatter configuration; verify with
`deno fmt --check` on the changed scope (or the whole repository when touch
points are widespread). Applying `deno fmt` to satisfy the check is REQUIRED
when drift is detected. The `deno task check` script MAY be used as a single
local gate when it already includes these steps.

Quiz routes MUST keep a strict split between path parameters that define quiz
identity and query parameters or local storage that define player-local
preferences and progress. Invalid category slugs or malformed difficulty
encodings MUST fail safely by redirecting players back to a recoverable entry
point.

Player-facing data transfer MUST stay minimal: only the active quiz payload,
category-scoped answer suggestions, and state required for hydration may reach
the browser. Audio fragments MUST be fetched on demand rather than bundled.
Social sharing metadata SHOULD be preserved on shareable quiz routes because
every quiz is intended to be URL-shareable.

## Delivery Workflow

Every feature spec MUST identify the affected user journey, whether the change
alters quiz identity, what security or admin surface it touches, and how mobile
behavior will be validated. Ambiguity about whether a setting affects quiz
selection MUST be resolved in the spec before planning.

Every implementation plan MUST include a constitution check that explicitly
confirms: deterministic quiz identity is preserved, server-only boundaries are
maintained, mobile-first constraints are addressed, admin security implications
are covered, verification work is scheduled, the components/islands boundary
(SSR-only `components/` and non-island route UI; client behavior only in
`islands/`) is respected, and code-quality rules (naming, Clean Code / SOLID /
DRY, `deno check` and `deno fmt --check`) are satisfied for delivered changes.
Any exception MUST be logged in a complexity or risk section with justification.

Contributors MUST run `deno check` and `deno fmt --check` on affected code
before considering work complete; failures are blocking for review unless
explicitly waived with justification in the plan.

Task lists MUST remain organized by independently testable user stories and MUST
include the verification tasks needed to prove compliance with these principles.
Cross-cutting tasks for mobile validation, security review, deterministic logic
verification, Deno static analysis/format checks, and SSR versus island UI split
reviews MUST be added when the affected feature warrants them.

## Governance

This constitution supersedes conflicting guidance in feature specs, plans, and
task lists. All new planning artifacts under `.specify/` MUST be checked against
it.

Amendments require updating this document and any affected templates in the same
change so future work inherits the new rules. Amendments that add or materially
expand principles or governance requirements require a MINOR version bump.
Amendments that redefine or remove a principle require a MAJOR version bump.
Clarifications, wording fixes, and non-semantic sync changes require a PATCH
version bump.

Compliance review is mandatory at two points: when a plan is drafted and before
implementation is considered complete. Reviewers MUST verify that quiz identity
semantics, server/client boundaries, the components/islands client-JavaScript
rule, mobile-first UX requirements, admin authentication guarantees, required
verification evidence, and code-quality gates (`deno check`, `deno fmt --check`,
no disallowed single-letter identifiers, adherence to Clean Code / SOLID / DRY
for the change) are all satisfied or explicitly waived with justification.

**Version**: 1.2.1 | **Ratified**: 2026-03-26 | **Last Amended**: 2026-03-26
