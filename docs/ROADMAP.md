# Musical Quiz App — Development Roadmap

This document describes the planned implementation phases and known risks. For product design see [DESIGN.md](DESIGN.md); for technical details see [ARCHITECTURE.md](ARCHITECTURE.md).

---

# Development Phases

## Phase 1 — Data Layer

**Goal:** establish the database schema and server-side logic that all other phases depend on.

- Define Drizzle ORM schema: `tracks`, `categories`, `trackCategories`, `adminUsers`, `passkeys`
- Run initial migration and seed with at least one full category of tracks
- Define TypeScript types: `Track`, `Category`, `QuizIdentity`, `QuizSettings`
- Implement `selectTracksForQuiz(identity)` with seeded PRNG (queries DB via Drizzle)
- Implement `slug.ts`: `encodeSlug` / `decodeSlug` / `generateShortSeed`
- Write unit tests for `selectTracksForQuiz` (same `QuizIdentity` → same output) and `slug.ts` (round-trip encode/decode)

## Phase 2 — Authentication

**Goal:** a working passkey-based login system protecting all admin routes.

- Implement passkey registration flow (`/api/auth/register`): challenge generation, attestation verification, credential storage via Drizzle
- Implement passkey authentication flow (`/api/auth/authenticate`): challenge generation, assertion verification, counter update, session cookie issuance
- Implement session validation helper used by all admin route handlers
- Build `/admin/login` page with "Sign in with passkey" UI (island)
- Add auth guard to all `/admin/*` route handlers (redirect to `/admin/login` if no valid session)
- Bootstrap script or one-time setup route to create the first admin user and register their passkey

## Phase 3 — Admin Panel

**Goal:** a working CRUD interface for managing all quiz content.

- Admin dashboard at `/admin` (summary counts, navigation)
- Track management: list, add (`/admin/tracks/new`), edit, delete (`/admin/tracks/[id]`)
  - Form fields: title, audio URL, difficulty, category assignments
- Category management: list, add (`/admin/categories/new`), edit, delete (`/admin/categories/[id]`)
  - Auto-generate slug from name; allow manual slug override
- Track ↔ Category assignment UI (multi-select or tag input, implemented as an island)
- Server-side form validation and error display for all admin forms
- Confirmation step before destructive operations (delete)

## Phase 4 — Home Page

**Goal:** a working settings screen that navigates to a valid quiz URL.

- Replace placeholder `routes/index.tsx` with the settings form
- Category selector (loaded from DB via route handler)
- Difficulty selector (Easy / Hard / Mixed)
- "Start quiz": generates seed, encodes slug, navigates to `/quiz/{category}/{slug}` (no query params — settings gate handles them)

## Phase 5 — Quiz System

**Goal:** a playable end-to-end quiz.

- Add `routes/quiz/[category]/[slug]/index.tsx`
- Route handler validates path params, queries DB via Drizzle, returns ordered track list and title list to page component
- `SettingsGate` island: if no query params, show personal settings form (replay limit) before starting; on confirm, write params to URL and begin
- `AudioPlayer` island: play/pause, replay within round (gesture-safe for mobile), enforces replay limit
- `AnswerInput` island: category-scoped suggestions (all titles in category, 3-character minimum), player must select from suggestions
- Round-by-round flow: submit → feedback → advance; all 20 tracks must be answered
- Quiz state persistence in localStorage (keyed by quiz URL path)
- Results screen: score summary, per-round breakdown, copy bare quiz path, play again (preserves settings)

## Phase 6 — Polish & Share

**Goal:** production-ready UX and social sharing.

- Open Graph and Twitter Card meta on the quiz route (category name + difficulty in description)
- Mobile UX pass: touch targets, autocomplete on small screens, iOS audio gesture handling
- "Copy quiz link" on results screen copies the bare path (no query params) using the Clipboard API
- Favicon and basic branding
- Cross-browser and cross-device testing

---

# Risks

## Audio Licensing

Short music fragments for recognition purposes may or may not fall under fair use depending on jurisdiction and platform. Before launching publicly, the legality of hosting the audio fragments should be reviewed.

**Mitigation:** Keep fragments very short (5–10 seconds). Consult legal guidance before a public launch. Consider partnering with rights holders for licensed content long-term.

## Bundle Size

As the track library grows, the dataset could become large.

**Mitigation:** Track data is loaded server-side only (inside Fresh route handlers via Drizzle) and is never shipped to the browser. Client bundle size is independent of the number of tracks. Per-category Drizzle queries (simple `WHERE` filters) keep server-side work proportional to the active category.

## Autocomplete Spoilers

If the autocomplete suggestions are too revealing (e.g. there is only one title that matches the first letters typed), they can effectively give away the answer.

**Mitigation:** Minimum 3-character threshold before suggestions appear. The autocomplete includes all titles in the category (not just the 20 quiz tracks), so early partial matches remain ambiguous.

## Mobile Audio Restrictions

iOS and some Android browsers block audio playback until the user has performed a gesture on the page.

**Mitigation:** Design the audio player so the first play is always triggered by an explicit user tap. Do not attempt autoplay.

## Seed Collisions / Predictability

A very short seed string reduces the space of possible quizzes, which could make it possible to brute-force or enumerate all quiz variants for a category.

**Mitigation:** Use a base-62 seed of sufficient length (e.g. 7–8 characters gives 62⁷ ≈ 3.5 trillion combinations), which makes brute-forcing impractical while keeping URLs short and typeable.

## Passkey Browser Support

Passkey support requires a modern browser and a compatible authenticator. Older browsers or devices without biometrics may not support the WebAuthn API.

**Mitigation:** The admin panel is an internal tool used by a controlled set of users on known devices. Browser compatibility for the public-facing quiz app is unaffected.

## Admin Credential Recovery

If an admin loses access to all their registered passkeys (e.g. lost device, no backup), they cannot log in.

**Mitigation:** Allow multiple passkeys to be registered per admin account (e.g. phone + laptop + hardware key). Provide a server-side recovery script (run directly on the server) as a last resort for bootstrapping a new credential.
