# 11 — Track suggestions and moderation

> Logged-in players propose tracks for a category; admins review a moderation
> queue and approve or deny each suggestion with a note. Approval is feedback
> only — adding a real track stays a manual admin action (see
> `09-admin-content-management.md`).

## Purpose

This subsystem owns the player-facing suggestion flow and the admin moderation
queue:

- A signed-in player picks a category, checks (via the quiz autocomplete) that
  the track is not already present, then submits a **title** + **link**.
- An admin sees all suggestions and records an **approved**/**denied** decision
  plus an optional **note** shown back to the player.

It is explicitly **not** responsible for creating tracks. Approving a suggestion
has no effect on the corpus; an admin still adds the track by hand through
`09-admin-content-management.md`. Category/track CRUD, autocomplete matching
(`05-answer-scoring-and-guess-matching.md`), and authentication
(`08-admin-authentication-and-passkeys.md`) live in their own specs.

## Behavior

- **Auth gate.** `GET`/`POST /suggest` require a signed-in user. Guests are
  redirected to `/account/login`. `/admin/suggestions*` require
  `users.admin === true` via `requireAdminSessionOrRedirect`; guests →
  `/account/login`, non-admins → `/account`.
- **Pick a category.** The form lists every category (not just quiz-eligible
  ones). On selection the island fetches `GET /api/categories/{slug}/tracks` and
  feeds the returned titles into the reused `AnswerInput` autocomplete.
- **Duplicate check (informational).** Given a category is chosen, When the
  typed search value normalizes to an existing title, Then a "already exists"
  hint shows. It does **not** block submission — the check is advisory.
- **Submit.** Given a category, a non-empty title, and a valid `http`/`https`
  link, When the player submits, Then a `pending` suggestion row is stored and
  the player is redirected to `/suggest?ok=1`. Invalid input redirects to
  `/suggest?err=<reason>` (`missing_title`, `invalid_url`, `invalid_category`).
- **Player feedback.** The `/suggest` page lists the player's own suggestions
  newest-first with a status badge and the admin note once reviewed.
- **Admin review.** Given an admin opens `/admin/suggestions/{id}`, When they
  submit Approve or Deny (optionally with a note), Then `status`, `adminNote`,
  `reviewedByUserId`, and `reviewedAt` are set and they return to the queue.
  Re-review is allowed so a decision can be corrected. A missing id redirects to
  the queue.
- **Invariant.** Reviewing never inserts a `tracks` or `track_categories` row.

## Data model

`track_suggestions` in `src/db/schema.ts` (read/written only by this subsystem):

- `id`, `userId` → `users.id` (cascade), `categoryId` → `categories.id`
  (cascade), `title`, `youtubeUrl`.
- `status`: `"pending" | "approved" | "denied"` (default `pending`).
- `adminNote` (nullable), `reviewedByUserId` → `users.id` (`set null`),
  `reviewedAt` (nullable), `createdAt`.

Relations in `src/db/relations.ts`: `trackSuggestions.user`, `.category`, and
`users.trackSuggestions`. `reviewedByUserId` stays a plain FK column (never
traversed) so the relational `with: { user: true }` is unambiguous. The
serialized `SuggestionRow` shape (in `src/lib/trackSuggestions.ts`) flattens the
category and user relations for rendering.

The schema is applied with `deno task db:sync` (no migration files); `data/`
must exist first.

## Key files

- **Server-only:** `src/lib/trackSuggestions.ts` (create, list, get, review,
  pending count), `src/lib/suggestionValidation.ts` (pure URL/input validation,
  also imported by the island), `src/db/schema.ts`, `src/db/relations.ts`, the
  handlers in `src/routes/suggest.tsx` and `src/routes/admin/suggestions/`.
- **Islands (client):** `src/islands/TrackSuggestionForm.tsx` (reuses
  `src/islands/AnswerInput.tsx`).
- **Components (SSR):** `src/components/SuggestionStatusBadge.tsx`,
  `src/components/SuggestionStatusList.tsx`,
  `src/components/admin/AdminSuggestionListItem.tsx`,
  `src/components/admin/SuggestionReviewForm.tsx`,
  `src/components/admin/ManageSuggestionsButton.tsx`.
- **Routes:** `src/routes/suggest.tsx`,
  `src/routes/admin/suggestions/index.tsx`,
  `src/routes/admin/suggestions/[id].tsx`. Entry points:
  `src/islands/AccountManage.tsx` (player link) and `src/routes/admin/index.tsx`
  (admin queue link + pending count).
- **Reused:** `src/lib/categories.ts` (`getCategoryBySlugOrId`),
  `src/lib/adminReads.ts` (`listAdminCategories`),
  `src/routes/api/categories/[key]/tracks.ts`, `src/lib/adminSession.ts`
  (`requireAdminSessionOrRedirect`).
- **Tests:** `tests/unit/lib/trackSuggestions_test.ts`. Admin-route gating is
  covered by the shared `requireAdminSessionOrRedirect` in
  `tests/admin_gate_test.ts`.

## Constraints and invariants

- **Server-first (Principle II).** All DB access and decision logic live in
  `src/lib/trackSuggestions.ts` and route handlers. The island only fetches
  category titles and posts a form; for client-side gating it imports the pure,
  DB-free `src/lib/suggestionValidation.ts` (`isValidSuggestionUrl`), never the
  `trackSuggestions.ts`/drizzle module graph.
- **Auth (Principle IV).** `/suggest` requires a session; `/admin/*` requires
  `users.admin === true`. Approve/deny are non-destructive, so no DELETE-style
  confirmation step is required.
- **Components are SSR-only (Principle VII).** The suggestion components contain
  no client behavior and are guarded by `composition_boundary_test.ts`.
- **Invariant.** `reviewSuggestion` updates only the suggestion row — track
  count is unchanged by approval.

## Verification approach

- **Unit:** `tests/unit/lib/trackSuggestions_test.ts` covers
  `isValidSuggestionUrl` (http/https accept; empty/garbage/non-http reject) and
  `validateSuggestionInput` (trim, `missing_title`, `invalid_url`) from the pure
  `src/lib/suggestionValidation.ts`.
- **Gate:** the admin suggestion routes reuse `requireAdminSessionOrRedirect`,
  whose guest→login / non-admin→account behavior is asserted in
  `tests/admin_gate_test.ts`. The player route uses the same inline
  `if (!user) redirect` guard as `src/routes/collection.tsx`. Tests in this repo
  do not import route handlers or the `db` singleton (which opens `data/quiz.db`
  at import), so route bodies are validated manually below.
- **Manual:** with `data/quiz.db` synced and the dev server running, sign in,
  open `/suggest`, pick a category (autocomplete populates), submit a title +
  link, and confirm it appears under "Your suggestions" as pending; then as an
  admin open `/admin/suggestions`, approve/deny with a note, and confirm the
  player's list shows the status + note and the track count is unchanged.
  Persistence-level automation is deferred because the repo has no shared
  DB-backed handler harness (see below).

## Open questions and known risks

- **Risk — DB-backed handler coverage.** `createSuggestion`/`reviewSuggestion`
  persistence is verified by pure-validation unit tests plus the manual plan
  above; the repo has no shared SQLite handler fixture (tests avoid importing
  the `db` singleton). Adding one would let us cover the full create/review
  round-trip automatically.
- **Open question — spam.** There is no rate limiting on `POST /suggest`;
  consistent with the roadmap, abuse mitigation is expected at the edge.
- **Open question — link scope.** Any `http`/`https` URL is accepted (not
  restricted to YouTube); tighten to YouTube-only normalization if needed.
