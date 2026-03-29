# Feature Specification: Passkey registration and login

**Feature Branch**: `004-passkey-auth`\
**Created**: 2026-03-29\
**Status**: Draft (clarified 2026-03-29)\
**Input**: User description: "Implement registration and login for any user…
(passkey registration with chosen username; discoverable login without username;
optional future scores/leaderboards; immediate use for admin access; sessions in
DB; cookie and middleware constraints as specified; second passkey; admin flag;
account management from home; out-of-scope items as specified)."

## Overview

Visitors can **register** an account with a **chosen username** and a
**passkey** bound to that account. They can **log in** later using **only**
discoverable passkeys (device picker), without typing a username. **Sessions**
tie the browser to the logged-in user until expiry or sign-out.
**Administrators** are the same kind of account with an elevated flag and may
access the **admin area** when authenticated. **Account management** (including
adding a **second passkey**) is reachable from the **home page**. This lays
groundwork for future score storage and leaderboards but does not require those
features in this delivery.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Register with username and passkey (Priority: P1)

As a new visitor, I want to choose a username and register a passkey so that I
have an account I can use to sign in later and (when applicable) access
administrative features.

**Why this priority**: Without registration, no accounts, sessions, or admin
gating exist.

**Independent Test**: Complete registration on a passkey-capable browser with a
valid-length username and confirm the app shows a logged-in or success state and
that a subsequent visit can authenticate.

**Acceptance Scenarios**:

1. **Given** I am not logged in, **When** I complete registration with a
   username of 3–24 characters and finish passkey creation, **Then** I have an
   account associated with that username and passkey and am in an authenticated
   session.
2. **Given** I enter a username shorter than 3 or longer than 24 characters,
   **When** I attempt to register, **Then** registration does not complete and I
   receive clear feedback about the length rule.
3. **Given** I cancel or fail passkey creation during registration, **When** the
   flow ends, **Then** no durable account/session is left in an inconsistent
   state (user understands registration did not finish).

---

### User Story 2 - Log in with discoverable passkey (no username) (Priority: P1)

As a returning user, I want to sign in using my device’s passkey picker
**without entering my username**, so login is quick and matches how discoverable
credentials work.

**Why this priority**: Core value of passkey-based auth for return visits.

**Independent Test**: From a logged-out state, start login, use only the
OS/browser passkey UI (no username field), and land authenticated as the correct
account.

**Acceptance Scenarios**:

1. **Given** I have a registered passkey on this device, **When** I start login
   and complete WebAuthn with a discoverable credential, **Then** I am signed in
   as the matching account without typing a username.
2. **Given** I have no usable passkey, **When** I attempt login, **Then** I see
   a clear failure or guidance without a misleading success state.

---

### User Story 3 - Session and admin access (Priority: P2)

As an operator, I want **admin-only areas** to be reachable only for accounts
marked as admin, so the admin surface is protected like any other authenticated
route but with an extra privilege check.

**Why this priority**: Stated immediate goal alongside registration.

**Independent Test**: Compare a normal user session vs an admin-flagged session
accessing the admin entry point; unauthenticated access is denied.

**Acceptance Scenarios**:

1. **Given** I am logged in as a user **without** admin privilege, **When** I
   try to open the admin area, **Then** I am denied (not shown the admin
   experience)—e.g. HTTP **403**, redirect to a safe non-admin page, or
   equivalent, consistently for all non-admin authenticated users.
2. **Given** I am logged in as a user **with** admin privilege, **When** I open
   the admin area, **Then** I can use it normally.
3. **Given** my session is missing or invalid, **When** I request a protected
   page, **Then** I am treated as logged out for authorization purposes.

---

### User Story 4 - Account management from home and second passkey (Priority: P2)

As a logged-in user, I want to reach **account management** from the **home
page** and **add another passkey** so either registered passkey can unlock my
account.

**Why this priority**: Recovery/redundancy and a clear place to manage the
account.

**Independent Test**: From home, navigate to account management; add a second
passkey; use **log out** from that same area; log in with each passkey
successfully.

**Acceptance Scenarios**:

1. **Given** I am on the home page, **When** I follow the account-management
   entry, **Then** I reach account management without needing a deep URL.
2. **Given** I am logged in, **When** I complete “add passkey”, **Then** both
   the original and the new passkey can be used in a subsequent login to the
   same account.
3. **Given** I am logged in and on **account management**, **When** I use **log
   out**, **Then** my session ends and I am not treated as authenticated on the
   next request unless I log in again.

---

### Edge Cases

- **Expired or revoked session**: User is treated as logged out; protected
  routes redirect or deny consistently.
- **Cookie present but unknown session id**: No authenticated user; cookie
  handling does not crash the app.
- **Concurrent sessions / multiple devices**: Each browser session is
  independent; logging out one does not imply logout elsewhere unless product
  defines otherwise (default: per-browser session only).
- **Second passkey add fails mid-flow**: User remains logged in with existing
  passkeys; partial state is not advertised as complete.
- **Admin flag changes while logged in**: Next request reflects current server
  state (no long-lived stale admin access in the same session unless explicitly
  designed—default: privilege read from authoritative data each time).

**Validation**: Manual checks for the edge cases above are listed in
`specs/004-passkey-auth/quickstart.md` (Edge-case and SC-005 sections) so
acceptance stays traceable without duplicating full steps here.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-000**: This feature does **not** change **quiz identity** (`/quiz/...`
  path semantics) or **player-local** quiz settings (query params or browser
  storage for quiz play). Authentication and sessions are orthogonal to
  shareable quiz URLs and local progress keys.
- **FR-001**: The system MUST allow **any** visitor to **register** with a
  **username** and **one** passkey, subject only to username **length** rules
  (minimum 3, maximum 24 characters). No other username validation (e.g.
  uniqueness, character set, reserved names) is required in this scope.
- **FR-002**: The system MUST support **login** using **discoverable** passkeys
  such that the user **does not** enter a username as part of the login flow.
- **FR-003**: The system MUST maintain **sessions** in server-side storage
  backed by a **sessions** table (or equivalent **durable** persistence with the
  same semantics: UUID session id, **server-side** row invalidation on logout,
  no substitution of client-only “session” state).
- **FR-004**: The session UUID MUST be carried in an **HTTP cookie** in the
  user’s browser. That cookie MUST be **HttpOnly** and **SameSite=Strict**. In
  non-development deployments, the cookie MUST also be **Secure**. Development
  mode MAY relax **Secure** when required for local HTTP testing.
- **FR-005**: While authenticated, the user MUST be able to **add a second
  passkey** to the same account. After success, **either** passkey MUST
  authenticate that account on login.
- **FR-006**: **Administrator** accounts MUST be represented like ordinary user
  accounts with an **admin=true** (or equivalent boolean) flag; authorization to
  the admin area MUST depend on that flag for the authenticated user. The
  application MUST **not** implement any logic that **assigns**, **promotes**,
  or **revokes** admin (no flows, rules, or UI for “who becomes admin”); it only
  **reads** the flag from persisted user data.
- **FR-007**: The **home page** MUST expose a clear path to **account
  management** (navigation or link) for **both** guests and authenticated users:
  guests need a visible entry to register, log in, or open the account hub;
  logged-in users need a path that reaches management within SC-004 (e.g. one
  link to `/account` or equivalent hub).
- **FR-008**: The system MUST **load** the current session (or absence thereof)
  before applying authorization or rendering authenticated UI, and MUST
  **persist** any updates made to session-backed data during handling so the
  **next** request observes them (no “lost” in-request session changes).
- **FR-009**: The system MUST provide **log out** on the **account management**
  surface only (not required in global navigation or every page). Log out MUST
  end the server-side session and clear the session cookie so subsequent
  requests are unauthenticated. **Implementation intent**: Relocate any existing
  **log out** control (e.g. on **`/admin/*`** pages) to **account management**
  and **remove** logout affordances from the admin UI so FR-009 cannot be
  bypassed via the admin shell.

### Non-Goals (out of scope)

- **Account deletion** (and related data-erasure flows).
- **Username rules beyond length** (uniqueness, normalization, profanity,
  reserved words, etc.).
- **Scores and leaderboards** (only acknowledged as a future possibility).
- **Admin assignment logic** in the app (who gets **admin=true** is outside this
  feature; the app only enforces the flag for access).
- **Rate limiting, brute-force throttling, and registration/login abuse
  controls** beyond what the platform or deployment provides (explicitly
  deferred; not a requirement for this delivery).
- **Account or passkey recovery** when the user has lost all credentials
  (explicitly out of scope).

### Key Entities _(include if feature involves data)_

- **User account**: Internal identity; **username** (display/handle, length
  3–24); **admin** boolean; association to one or more passkeys.
- **Passkey credential**: WebAuthn credential bound to a user account; **no
  maximum** number per account (at least two MUST be supported for SC-005).
- **Session**: Opaque **UUID**; stored row in **sessions**; maps browser cookie
  to authenticated user and any session-scoped data the product needs; lifecycle
  rules (expiry, rotation) follow sensible defaults unless specified later.
  Durable profile and passkey material stay in **user** / **passkey** stores;
  the session JSON blob (if used) MUST stay **minimal** and MUST NOT hold
  long-lived secrets or bulk PII.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A new user on a compatible device can complete **registration**
  (username + passkey) and reach an **authenticated** state in **under 3
  minutes** without assistance, assuming normal network conditions.
- **SC-002**: **100%** of successful **login** flows in scope proceed
  **without** a username entry step (verification by test script or manual test
  checklist).
- **SC-003**: **100%** of attempts to open the **admin area** without an
  **admin** account result in **denial**; **100%** of attempts with a valid
  **admin** session succeed.
- **SC-004**: From the **home page**, a logged-in user can open **account
  management** in **at most two** navigational actions (e.g. one link or button
  plus landing).
- **SC-005**: After adding a **second** passkey, **both** passkeys succeed in at
  least **five consecutive** paired login tests (each passkey used alternately)
  without re-registration.
- **SC-006**: After **log out**, **100%** of immediate follow-up checks show the
  user as **not** authenticated for protected pages (no stale client-only
  “logged in” state without a matching server session).

### Definitions (for SC-003, SC-004, SC-006)

- **Admin area** (SC-003): All URLs under the application’s admin path prefix
  (e.g. `/admin` and its descendants), matching the **Passkey-Secured
  Administration** constitution gate.
- **Protected pages** (SC-006): Routes that **require an authenticated session**
  for authorization (including **account management** and the **admin area**).
  Quiz play routes remain **out of scope** for this check per **FR-000** (they
  are not “protected” by session in the SC-006 sense).
- **Account management surface** (FR-007, FR-009): The account hub and its
  dedicated routes (e.g. `/account` and descendants) where registration, login,
  add-passkey, and **log out** live—not global nav on every page.

## Constitution Alignment _(mandatory)_

### Quiz Identity Impact

- **Identity Change**: **No**. Shareable quiz paths and deterministic quiz
  selection are unchanged.
- **Player-Local State**: Quiz-related query params and local storage remain
  independent of account sessions; auth does not redefine quiz URLs.

### Security & Data Boundaries

- **Server Responsibilities**: User records, passkey verification, session
  **rows in sessions**, cookie attributes, admin authorization, and any WebAuthn
  challenge storage MUST run server-side. The **session** middleware MUST read
  the session cookie (via **@std/http** cookie helpers), hydrate **ctx.state**
  with session-derived context for the request, and **write back** any mutations
  to the session store in that same middleware so FR-008 holds. It SHOULD run
  **immediately after** any `staticFiles()` (or equivalent) middleware so static
  assets avoid unnecessary session DB work, while still being the **first**
  middleware that participates in **session-backed `ctx.state`** for HTML and
  API routes.
- **Client Responsibilities**: WebAuthn client ceremonies (passkey creation and
  assertion), minimal UI for registration/login/account management, and
  navigation from home. No session secrets in non-HttpOnly storage.
- **Components Versus Islands**: Route shells and links may be SSR; WebAuthn and
  interactive account flows live in **islands** where client APIs are required.
  Islands MUST use **@preact/signals** only—no `preact/hooks` or hook APIs. No
  prohibited client-only patterns in `components/`.

### Mobile & Accessibility Validation

- **Primary Mobile Flow**: From home → account management → register or log in
  using the OS passkey sheet; admin users open admin from an authenticated
  session on a phone-sized viewport.
- **Validation Evidence**: Manual pass on a mobile browser (or emulator) for
  passkey prompts; focus order and visible labels on registration/login and
  account management; denial paths tested without relying on hover-only UI.

### Code Quality & Tooling

- **Deno**: Delivered changes MUST pass **`deno check`** and
  **`deno fmt --check`** for touched code.
- **Maintainability**: Session and auth logic centralized (middleware + shared
  helpers); avoid duplicating cookie parsing; naming stays descriptive (no
  single-letter identifiers except `_` for unused).

## Assumptions

- Users run a **browser and platform that support passkeys**; unsupported
  environments may show a clear unsupported message (exact copy is product
  discretion).
- **Session expiry** and **absolute timeout** follow common web practice (e.g.
  sliding window with a maximum lifetime) unless a future spec tightens this;
  values are implementation details as long as behavior is secure and
  predictable.
- **Username uniqueness** is **not** required in this scope; if duplicates are
  allowed, internal user ids still distinguish accounts for sessions and
  passkeys (product may later add uniqueness).
- **Account deletion** and **extra username validation** are explicitly deferred
  per Non-Goals.
- **Cookie name** and **session payload** fields are left to implementation as
  long as FR-003–FR-004, FR-008, and FR-009 are satisfied.
- **Engineering mandates** (from product input): session cookies are managed
  with **@std/http**; session context is exposed on Fresh **ctx.state** via the
  dedicated **session** middleware (registered immediately after static file
  serving, per Constitution Security), which also persists state changes so
  **FR-008** holds (single place that loads session before handlers and writes
  back mutations—reduces inconsistent double-send / stale-state risks).
- **Admin flag**: How **admin=true** is set on a user record is **out of scope**
  for application logic (see FR-006 and Non-Goals). The product does **not**
  need any in-app rules or flows for who becomes admin.
- **Passkey count**: At least **two** credentials per account MUST be supported
  (add second passkey). There is **no maximum** number of passkeys per account.
- **API contracts**: JSON shapes and paths for registration, login, add-passkey,
  and logout are recorded in **`specs/004-passkey-auth/contracts/README.md`**
  for traceability; they align with the functional requirements above.
- **“Development mode” for cookies**: Means the same environment the app already
  uses for local non-TLS development (e.g. explicit env flag or well-documented
  default), where **Secure** on the session cookie MAY be omitted so HTTP
  localhost works; production-like environments use **Secure**.
- **HTTPS in production**: Staging and production MUST be served over **HTTPS**
  so **Secure** session cookies are meaningful; plain HTTP is for local
  development only.
- **WebAuthn RP ID and origin**: Correct **RP ID** and **origin** configuration
  is a **deployment security prerequisite** (documented in engineering
  quickstart / env); misconfiguration is out of scope for application-level
  requirements text.
- **Operational logging**: The spec does not mandate field-level redaction in
  logs; operators SHOULD NOT log raw **session cookie** values or WebAuthn
  secrets. Usernames and internal ids may appear in operational logs like other
  apps.
- **SC-004 vs future interstitials**: “At most two navigational actions” applies
  to reaching account management from home; it does not forbid optional
  informational pages that do not block that path.

## Clarifications _(recorded 2026-03-29, updated per product answers)_

| Topic                         | Resolution                                                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Logout                        | **FR-009** — from **account management** only; **relocate** logout off admin pages; clears server session and cookie. |
| Admin                         | **No in-app logic** for who becomes admin (FR-006); flag is **read** only for authorization.                          |
| Passkeys                      | **No maximum** per account; minimum two for SC-005.                                                                   |
| Dev vs prod cookie **Secure** | **Secure** when not in dev; **dev** aligns with existing app env conventions.                                         |
