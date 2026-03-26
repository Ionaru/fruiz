# Feature Specification: Musical Quiz App MVP

**Feature Branch**: `001-musical-quiz-app`\
**Created**: 2026-03-26\
**Status**: Draft\
**Input**: User description: "Adapt specification from docs/DESIGN.md"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Complete a music quiz on mobile (Priority: P1)

As a player, I want to start a quiz, hear short music fragments, submit answers,
and receive a final score so I can play a complete music-guessing game on my
phone.

**Why this priority**: This is the core product value. Without a full playable
quiz loop, the application does not fulfill its primary purpose.

**Independent Test**: A player can select a category and difficulty, start a
quiz, answer or skip tracks until all 20 are completed, and reach a results
screen showing score and per-track outcomes.

**Acceptance Scenarios**:

1. **Given** a player on the home screen with available categories, **When**
   they choose a category and difficulty and start a quiz, **Then** the app
   generates a valid quiz URL and loads a playable 20-track quiz.
2. **Given** an active quiz, **When** the player selects a track, uses the audio
   player, chooses a title from autocomplete, and submits, **Then** the answer
   is locked, scored, and reflected in the track overview.
3. **Given** a quiz with unanswered tracks remaining, **When** the player skips
   one or more tracks and later answers all tracks, **Then** the quiz ends
   automatically and the results screen shows the final score and per-track
   summary.

---

### User Story 2 - Share and resume the same quiz (Priority: P2)

As a player, I want quiz URLs to be shareable and my progress to persist on my
device so I can resume later and invite others to play the same quiz.

**Why this priority**: Shareability and deterministic replay are the
differentiating product features, but the application can still deliver a
playable MVP with User Story 1 alone.

**Independent Test**: A player can open a bare quiz URL, set personal replay
preferences without changing the track list, refresh or revisit the same URL on
the same device, and recover their saved progress.

**Acceptance Scenarios**:

1. **Given** a bare quiz URL without query parameters, **When** a player opens
   it, **Then** the app presents a settings gate for personal preferences before
   gameplay begins.
2. **Given** two players open the same quiz path with different replay limits,
   **When** they start playing, **Then** they receive the same quiz tracks in
   the same order but keep separate personal settings and device-local progress.
3. **Given** a player has partial progress on a quiz, **When** they refresh or
   reopen the same quiz URL on the same device, **Then** the app restores saved
   progress from local storage.
4. **Given** a player finishes a quiz, **When** they tap the copy-link action,
   **Then** the app copies the bare quiz path so another player can play the
   same quiz.

---

### User Story 3 - Manage quiz content securely as an admin (Priority: P3)

As an admin, I want to sign in with a passkey and manage tracks and categories
so the quiz library can be curated without direct database access.

**Why this priority**: Admin management is required to operate the product long
term, but the first player-facing MVP can be demonstrated with seed data before
the admin panel is complete.

**Independent Test**: An authenticated admin can sign in with a passkey, add or
edit tracks and categories, manage category assignments, and safely confirm
destructive actions.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor requests `/admin`, **When** no valid
   admin session is present, **Then** the app redirects them to `/admin/login`.
2. **Given** an admin with a registered passkey, **When** they complete passkey
   authentication, **Then** the app creates a valid session and grants access to
   `/admin`.
3. **Given** an authenticated admin on the track management interface, **When**
   they create or edit a track with title, audio URL, difficulty, and category
   assignments, **Then** the new data is persisted and becomes available to quiz
   generation.
4. **Given** an authenticated admin attempts a destructive action, **When** they
   confirm deletion, **Then** the system removes the data only if the operation
   passes the relevant constraints.

### Edge Cases

- Invalid quiz URLs with an unknown category slug or malformed difficulty prefix
  redirect the player back to the home screen.
- A quiz URL without personal settings query parameters opens the settings gate
  before gameplay, but the quiz identity and track list remain unchanged.
- If a mobile browser blocks audio playback before a user gesture, the first
  track play waits for an explicit tap instead of attempting autoplay.
- When a player reaches the configured replay limit for a track, replay is
  disabled until they submit an answer or skip the track.
- If local storage contains saved progress for a quiz and the player opens the
  same quiz with different query parameters, the app restores only device-local
  progress and MUST NOT alter the underlying track list.
- If an admin session expires while using the panel, the next protected request
  redirects the user to `/admin/login`.
- Category deletion is blocked when the category still has track assignments.
- A category+difficulty combination with fewer than 20 eligible tracks MUST NOT
  be presented as an available quiz option.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-000**: This feature establishes quiz identity semantics. The quiz path
  `/quiz/{category}/{difficulty-char}{seed}` MUST fully determine the category,
  difficulty, seed, and resulting ordered track list.
- **FR-001**: The home screen MUST allow players to choose a category and one
  difficulty mode: `easy`, `hard`, or `mixed`.
- **FR-001A**: The system MUST expose only category+difficulty combinations with
  at least 20 eligible tracks as available quiz options.
- **FR-002**: Starting a quiz MUST generate a short seed, encode the difficulty
  into the quiz path, and navigate the player to a shareable quiz URL.
- **FR-003**: The system MUST generate quizzes deterministically so the same
  quiz path always yields the same ordered set of 20 tracks.
- **FR-004**: The system MUST present all 20 quiz tracks in a non-linear
  overview where players can choose any unanswered or skipped track.
- **FR-005**: The active track panel MUST provide audio playback, answer input,
  submit, skip, and score visibility during gameplay.
- **FR-006**: The answer input MUST use category-scoped autocomplete based on
  known titles in the active category and MUST require the player to select from
  suggestions rather than submit free text.
- **FR-007**: The system MUST normalize player answers and correct titles for
  case, whitespace, and punctuation before deciding whether an answer is
  correct.
- **FR-008**: Submitted answers MUST be locked and MUST NOT be editable after
  submission.
- **FR-009**: The quiz MUST end automatically only after all 20 tracks have been
  answered, and the results screen MUST show final score plus per-track
  outcomes.
- **FR-010**: The system MUST support a player-local replay limit stored outside
  quiz identity, with `0` representing unlimited replays.
- **FR-011**: When a player opens a bare quiz URL with no personal settings
  query parameters, the app MUST show a settings gate before gameplay starts.
- **FR-012**: Quiz progress, including answered state, score, and skipped
  tracks, MUST persist in local storage keyed by the quiz URL path so the same
  device can resume progress later.
- **FR-013**: The results screen MUST expose a copy-link action that copies the
  bare quiz path without player-local query parameters.
- **FR-014**: The app MUST expose Open Graph and Twitter card metadata on quiz
  pages so shared quiz links render correctly in messaging and social platforms.
- **FR-015**: The admin area MUST be available under `/admin/*` and MUST require
  authenticated passkey-backed sessions.
- **FR-016**: The system MUST support passkey registration and passkey
  authentication for admin users and MUST NOT store passwords.
- **FR-017**: Admins MUST be able to list, add, edit, and delete tracks,
  including title, audio URL, difficulty, and category assignments.
- **FR-018**: Admins MUST be able to list, add, edit, and delete categories,
  with slug generation from category names and manual slug editing allowed.
- **FR-019**: The system MUST prevent deletion of categories that still have
  assigned tracks.
- **FR-020**: Destructive admin operations MUST require an explicit confirmation
  step.
- **FR-021**: All database access, quiz selection logic, and authentication
  verification MUST run server-side; the browser MUST receive only the
  serialized data required for the current quiz or admin UI.
- **FR-022**: The player-facing experience MUST be mobile-first, including
  touch-friendly controls, no hover-only interactions, and gesture-safe audio
  playback.
- **FR-023**: The system MUST redirect invalid quiz URLs to the home screen
  instead of displaying a broken quiz page.
- **FR-024**: The system MUST expose a "Play again" action on the results screen
  that generates a new seed for the same category and difficulty while
  preserving player-local settings.
- **FR-025**: The system MUST support multiple tracks from the same title
  appearing in a single quiz when deterministic selection produces that outcome.
- **FR-026**: The system MUST support tracks belonging to multiple categories,
  and category membership MUST affect both quiz selection and autocomplete
  suggestion pools.

### Key Entities _(include if feature involves data)_

- **Track**: A short audio fragment with an identifier, title, audio URL,
  difficulty, and one or more category assignments.
- **Title**: The film, TV show, or game name a track belongs to; titles are the
  values players select in autocomplete.
- **Category**: A named grouping of tracks with a human-readable name and unique
  slug used in quiz URLs and admin management.
- **Quiz Identity**: The shareable path-level combination of category slug,
  difficulty, and seed that deterministically defines the quiz content.
- **Quiz Settings**: Player-local preferences, including replay limit, that do
  not alter the quiz track list.
- **Quiz Progress**: Device-local state for answered tracks, skipped tracks, and
  score keyed by quiz path.
- **Admin User**: A privileged user who can access `/admin/*` and manage
  content.
- **Passkey Credential**: A WebAuthn credential linked to an admin user and used
  for passwordless authentication.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A player can start and complete a full 20-track quiz on a mobile
  device without using desktop-only interactions.
- **SC-002**: Opening the same quiz path on two devices yields the same
  category, difficulty, and ordered track list in 100% of validation runs.
- **SC-003**: A player who refreshes or reopens the same quiz path on the same
  device resumes prior progress without losing answered-state data.
- **SC-004**: An unauthenticated user cannot access protected admin routes,
  while an admin with a valid passkey can sign in and complete content
  management tasks successfully.
- **SC-005**: Copying and sharing a completed quiz link allows another player to
  load the same quiz identity without inheriting the original player's replay
  settings or progress.

## Constitution Alignment _(mandatory)_

### Quiz Identity Impact

- **Identity Change**: This feature defines the core quiz identity rules. The
  quiz path consists of category slug plus a combined difficulty-prefix and seed
  string. The same path MUST always produce the same ordered 20-track quiz.
- **Player-Local State**: Replay limit is stored as query parameters, and quiz
  progress is stored in local storage keyed by quiz path. These values
  personalize the experience but MUST NOT alter track selection.

### Security & Data Boundaries

- **Server Responsibilities**: Category lookup, slug decoding, deterministic
  track selection, title-list retrieval, database reads and writes, passkey
  challenge generation and verification, session validation, and admin CRUD
  mutations remain server-side.
- **Client Responsibilities**: Islands manage interactive playback, autocomplete
  selection, overview/active-track state, and device-local progress restoration.
  The browser receives only the active quiz payload, category-scoped title
  suggestions, and the minimum admin UI data required for rendering.

### Mobile & Accessibility Validation

- **Primary Mobile Flow**: On a phone, the player selects settings, starts a
  quiz, taps a track from the overview, triggers audio with a gesture-safe
  control, selects an autocomplete result, submits or skips, and repeats until
  reaching the results screen.
- **Validation Evidence**: Validation MUST cover touch-target usability,
  small-screen layout, keyboard navigation where applicable, labeled interactive
  controls, color contrast for status indicators, mobile clipboard behavior, and
  first-play audio behavior on gesture-restricted browsers.

## Assumptions

- Players use modern browsers with JavaScript enabled and network access to
  fetch quiz data and stream audio fragments.
- The initial release ships with enough seeded content in at least one category
  to support a full 20-track quiz.
- Admin accounts are created out-of-band, and public self-service admin
  registration is out of scope.
- Audio licensing, public hosting policy, multiplayer, persistent leaderboards,
  analytics, and community submissions remain out of scope for this MVP.
