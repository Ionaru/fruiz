# Musical Quiz App

## Product Design Document / Game Design Document

---

# 1. Product Overview

## 1.1 Concept

The Musical Quiz App is a **mobile-first web application** where players identify **films, TV shows, or video games** from short music fragments.

The game generates **deterministic quizzes using a seed**, allowing the exact same quiz to be reproduced and shared via a URL.

Primary goals:

- Simple, accessible music-guessing gameplay
- Fully shareable quizzes via URL
- Mobile-friendly interaction
- Deterministic quizzes for streaming and social play

The application uses a **server-client architecture** from the start, taking advantage of Deno Fresh's server-side rendering and handler system to compute quiz data on the server before the page renders. See [ARCHITECTURE.md](ARCHITECTURE.md) for technical details.

---

# 2. Glossary

| Term | Definition |
| --- | --- |
| **Player** | A person visiting the website to take a quiz. |
| **Admin** | An authenticated user who can manage tracks, categories, and titles through the admin panel. |
| **Track** | A short audio fragment taken from a film, TV show, or video game soundtrack. |
| **Title** | The name of the film, TV show, or video game that a track belongs to. One title can have multiple tracks. |
| **Category** | A named group of tracks sharing a theme (e.g. Disney, Video Games). Tracks can belong to multiple categories. |
| **Round** | A single step in a quiz: one track plays and the player submits one guess. |
| **Quiz** | A sequence of 20 rounds generated from a seed, category, and settings. |
| **Seed** | A short string used to deterministically generate a quiz. The same seed always produces the same quiz. |
| **Difficulty** | A per-track label (`easy` or `hard`) indicating how iconic/recognizable the track is. |
| **Replay Limit** | A player-configured cap on how many times a track can be replayed before the player must submit or skip. A lower limit increases difficulty. |
| **Passkey** | A cryptographic credential stored on the admin's device (Touch ID, Windows Hello, hardware key) used to authenticate without a password. |

---

# 3. Product Goals

## 3.1 Primary Goals

1. Deliver a fast, mobile-friendly music quiz experience.
2. Enable players to share quizzes through deterministic URLs.
3. Support multiple categories of media music (film, TV, games).
4. Ensure reproducible quiz generation for streaming, competitions, and social play.
5. Provide an admin panel for managing all quiz content (tracks, categories, titles).
6. Secure admin access with passkey authentication — no passwords stored.

## 3.2 Non-Goals (Initial Version)

- User accounts for players
- Persistent player leaderboards
- Audio licensing or hosting infrastructure

---

# 4. Target Users

## 4.1 Casual Players

People who enjoy music quizzes, movie trivia, and game music. Typical use: quick gameplay sessions, sharing quiz links with friends.

## 4.2 Streamers / Content Creators

Users who host quizzes live, need deterministic rounds, and share links with their audience so viewers can follow along.

## 4.3 Groups / Social Play

Friends playing together: one device plays the audio fragment, the group guesses the answer together.

## 4.4 Admins / Content Managers

Users with privileged access who curate the track library and categories through the admin panel. Authentication is via passkey — no password required.

---

# 5. Gameplay Overview

## 5.1 Core Loop

1. Player opens the app and configures quiz settings.
2. App generates a seed and builds a shareable URL.
3. Quiz begins. All 20 tracks are available from the start.
4. Player selects any unanswered track.
5. A track fragment plays automatically or on demand.
6. Player types their guess into the answer field.
7. The autocomplete field suggests titles from the active category.
8. Player submits their answer or skips the track to return to it later.
9. Feedback is shown on submission (correct / incorrect).
10. Player continues with any remaining unanswered track, in any order.
11. When all 20 tracks have been answered, the results screen is shown automatically.

---

# 6. Game Rules

## 6.1 Quiz Structure

- **20 tracks per quiz** (default)
- The quiz is **non-linear**: tracks can be answered in any order
- A track can be **skipped** and returned to later, but all tracks must be answered before the quiz ends
- One guess per track; an answer cannot be changed after submission
- Tracks are chosen deterministically from the seed and settings
- The quiz URL fully encodes the quiz: same URL = same quiz

## 6.2 Track Structure

Each track represents a short music fragment from a specific title.

- A single title (film, show, or game) may have multiple tracks in the pool.
- Tracks have a difficulty rating reflecting how iconic the music is.
- A track can belong to multiple categories.

## 6.3 Scoring

| Outcome | Points |
| --- | --- |
| Correct answer | +1 |
| Incorrect answer | 0 |

Maximum score per quiz: **20 points**.

All 20 tracks must be answered before the quiz ends. Skipping is temporary — every track must eventually receive an answer.

Potential future scoring modes: time-based bonuses, hints that cost points.

## 6.4 Answer Validation

Answers are validated by normalizing both the player's input and the correct title:

- Case-insensitive
- Whitespace trimmed
- Punctuation ignored (e.g. `Wall·E` matches `WALL E`)

A match on the normalized strings counts as correct. Players must select a title from the autocomplete suggestions — freeform answers are not accepted. The autocomplete guides the player to the exact expected form, eliminating ambiguity.

> **Future improvement:** Explore fuzzy matching to handle complex titles more gracefully (e.g. roman numerals, articles, subtitles).

---

# 7. Categories

Tracks are grouped into categories. A track can belong to more than one category. The category determines the **track pool** used for quiz generation and the **answer suggestions** offered to the player.

Categories are managed through the admin panel and stored in the database. New categories can be added at any time without changing any game logic.

Example categories:

| Category | Description |
| --- | --- |
| Disney | Music from Disney animated films |
| Marvel | Music from the Marvel Cinematic Universe |
| Cartoons | Classic and modern cartoon soundtracks |
| Old-School TV | Theme songs and scores from classic TV series |
| Video Games | Music from video games (various) |
| Nintendo | Music specifically from Nintendo games |
| RPGs | Soundtrack music from RPG titles |

---

# 8. Difficulty System

Each track is assigned a difficulty level based on how iconic or recognizable the music is:

| Difficulty | Description |
| --- | --- |
| `easy` | Very recognizable; most players who know the category will identify it quickly |
| `hard` | More obscure; requires deeper knowledge of the title or franchise |

At quiz configuration, the player chooses one of:

- **Easy only** — pool is filtered to easy tracks before selection
- **Hard only** — pool is filtered to hard tracks before selection
- **Mixed** — all tracks in the category are eligible

Difficulty filtering happens **before** the seed-based shuffle and selection.

Difficulty is assigned by admins when adding or editing a track in the admin panel.

---

# 9. Track Selection

## 9.1 How Quizzes Are Generated

The combination of `seed + category + settings` is the complete specification for a quiz. Running the same inputs always produces the same ordered track list. This is what makes quizzes shareable and streamable.

## 9.2 Selection Parameters

| Parameter | Description |
| --- | --- |
| `seed` | Random string generated at quiz start |
| `categoryId` | The chosen category |
| `difficulty` | `easy`, `hard`, or `mixed` |

The quiz always contains **20 tracks**. This is fixed and not configurable by players.

## 9.3 Multiple Tracks per Title

A single title (film, show, or game) may have multiple tracks in the pool, and more than one track from the same title can appear in a single quiz. This is by design — different pieces of music from the same source test different knowledge.

---

# 10. User Interface

## 10.1 Home Screen

The home screen is where the player configures their quiz and starts.

**Settings that determine which tracks appear (encoded in the URL path):**

- **Category** — dropdown or card grid of available categories
- **Difficulty** — Easy / Hard / Mixed

**Personal settings (stored as query parameters, do not affect track selection):**

- **Replay Limit** — how many times a track can be replayed before the player must answer or skip (e.g. 1 = single listen, 3 = up to three listens, 0 = unlimited)

**Actions:**

- **Start Quiz** — generates a seed, builds the quiz URL (`/quiz/{category}/{difficulty-char}{seed}`), navigates to the quiz page
- **Random Quiz** *(optional)* — picks a random category and seed for instant play

The quiz URL path is the shareable identity of the quiz. Any personal settings appended as query params are the player's own preferences and do not change the track list.

## 10.2 Settings Screen (bare URL flow)

When a player opens a quiz URL that has **no query parameters** (e.g. a shared link or a typed URL), the app first shows a brief settings screen before starting the quiz.

This screen lets the player configure their personal preferences:

- Replay Limit
- (any other future personal settings)

Once confirmed, the settings are added as query params to the current URL and the quiz begins. The track list is already known (determined by the path) — the settings screen does not change it.

This means someone can share a bare URL like `/quiz/disney/m8f3k9p2` and every recipient plays the same tracks, with their own personal settings.

## 10.3 Quiz Screen

The quiz screen has two areas: the **track overview** and the **active track panel**.

### Track Overview

A persistent grid or list showing all 20 tracks with their status:

| Status | Meaning |
| --- | --- |
| Unanswered | Not yet attempted |
| Skipped | Attempted but skipped; still available |
| Correct | Answered correctly |
| Incorrect | Answered incorrectly |

The player can tap or click any unanswered or skipped track to make it the active track. Answered tracks (correct or incorrect) remain visible in the overview but cannot be re-attempted.

### Active Track Panel

**Elements:**

- Track indicator (e.g. "Track 7")
- Audio player (play/pause, replay button); replay count is tracked against the player's replay limit
- Answer input with autocomplete suggestions (category-scoped)
- **Submit** button — locks in the answer
- **Skip** button — marks the track as skipped and returns to the overview (or advances to the next unanswered track)
- Current score display

When the player reaches their configured replay limit for a track, the replay button is disabled and the player must submit an answer or skip.

**Track sequence:**

```
Select track → Track plays → Type guess → Submit (locked) or Skip (return later)
```

After submitting, feedback (correct / incorrect + correct answer) is shown briefly before returning to the overview or advancing to the next unanswered track.

### Finishing the Quiz

The quiz ends when **all 20 tracks have been answered** (correct or incorrect). The results screen opens automatically.

There is no early finish option. Skipped tracks remain available and must be answered before the quiz is complete.

### Quiz State Persistence

Quiz progress (answered tracks, scores, skip states) is persisted to the device's **localStorage**, keyed by the quiz URL path. This means:

- Refreshing the page or closing the tab does not lose progress
- Returning to the same quiz URL resumes where the player left off
- State is per-device and not synced across devices

## 10.4 Answer Input

The answer field uses **category-scoped autocomplete**. It suggests titles from the full set of known titles within the category — including titles that do not appear in the current quiz. The title list comes from the database (all tracks in the category), independent of which tracks are selected for any given quiz.

Rules:

- Suggestions appear after the player has typed at least **3 characters**
- All titles within the category are eligible suggestions, not just the 20 quiz tracks
- The player **must select a title from the suggestions** — freeform answers are not accepted
- Suggestions are filtered by the normalized input (case-insensitive, punctuation-ignored)

This approach:

- Prevents spoilers from other categories
- Avoids revealing which titles are in the quiz by including non-quiz titles
- Makes the input usable on mobile without a full keyboard
- Eliminates ambiguity about exact title spelling

## 10.5 Results Screen

Shown automatically when all 20 tracks have been answered.

**Elements:**

- Final score (e.g. "14 / 20")
- Per-track summary — for each of the 20 tracks: the correct title, the player's answer, and the outcome (correct / incorrect)
- **Copy quiz link** — copies the bare quiz path to the clipboard so others can take the same quiz
- **Play again** — generates a new seed for the same category and difficulty, preserving all personal settings
- **Back to home** — returns to the home screen

---

# 11. Admin Panel

The admin panel is accessible only to authenticated admin users. It provides a web-based interface to manage all quiz content without touching the database directly.

## 11.1 Access

- The admin panel is available at `/admin`.
- Authentication is required via passkey (see Section 12). Unauthenticated users are redirected to the login page at `/admin/login`.
- There is no public registration; admin accounts are created out-of-band (e.g. via a setup script or bootstrapping route).

## 11.2 Track Management

Admins can:

- **List** all tracks (with title, difficulty, category assignments, and audio URL)
- **Add** a new track (provide title, audio URL, difficulty, and one or more category assignments)
- **Edit** an existing track (update any field)
- **Delete** a track (removes the track and all its category assignments)

## 11.3 Category Management

Admins can:

- **List** all categories (with name, slug, and track count)
- **Add** a new category (provide name; slug is auto-generated from the name)
- **Edit** a category name or slug
- **Delete** a category (only allowed if the category has no track assignments)

## 11.4 Track ↔ Category Assignments

From the track edit view, admins can manage which categories a track belongs to. A track can be assigned to multiple categories simultaneously.

---

# 12. Authentication (Passkeys)

Admin access is protected by **passkey authentication**. No passwords are used or stored.

## 12.1 What Is a Passkey?

A passkey is a cryptographic key pair created and stored by the user's device (e.g. Touch ID on Mac, Face ID on iPhone, Windows Hello, or a hardware security key). The private key never leaves the device. Authentication works by the device signing a server-issued challenge with the private key; the server verifies the signature using the stored public key.

## 12.2 Login Flow

1. Admin navigates to `/admin/login`.
2. A login form presents a "Sign in with passkey" button.
3. The browser prompts the admin to authenticate with their registered device (biometric or hardware key).
4. The signed response is sent to the server and verified.
5. On success, a session cookie is issued and the admin is redirected to `/admin`.
6. On failure, an error is shown and the admin may retry.

## 12.3 Session Management

- Sessions are tracked via a signed `HttpOnly` cookie.
- Sessions expire after a configurable idle timeout.
- Admins can log out explicitly, which invalidates the session cookie.

## 12.4 Security Properties

- No passwords are ever stored.
- Passkeys are phishing-resistant: they are bound to the site's origin.
- The credential counter prevents replay attacks using a cloned credential.

---

# 13. Audio System

Tracks consist of **short music fragments**. The exact length is determined by the content; typically 5–15 seconds.

Playback requirements:

- HTML5 audio element
- Mobile-compatible: playback must be triggered by user gesture (browser requirement)
- Audio is **streamed on demand** — fragments are fetched when the player opens a track, not preloaded for the entire quiz
- Replay is allowed within a round, subject to the player's **replay limit** setting
- A single reusable audio element swaps its source between rounds to avoid memory overhead

> **Future improvement:** Scramble or obfuscate audio URLs to make it harder to inspect network traffic and identify tracks before playing them.

---

# 14. URL Design

The quiz URL is split into two parts with distinct roles:

## 14.1 Path — Quiz Identity

```
/quiz/{category}/{difficulty-char}{seed}
```

Example:

```
/quiz/disney/m8f3k9p2
```

| Segment | Example | Purpose |
| --- | --- | --- |
| `{category}` | `disney` | Category slug — filters the track pool |
| `{difficulty-char}` | `m` | Single character: `e`=easy, `h`=hard, `m`=mixed |
| `{seed}` | `8f3k9p2` | Short random string — determines track order |

The path **fully identifies a quiz**: same path = same tracks in the same order, on any device, for any player. This is the piece that gets shared.

The seed is a short base-62 string (6–8 characters), giving billions of unique combinations while remaining typeable.

## 14.2 Query Parameters — Personal Settings

```
/quiz/disney/m8f3k9p2?limit=3
```

| Parameter | Purpose |
| --- | --- |
| `limit` | Replay limit — max times a track can be replayed (0 = unlimited) |

Query parameters represent the player's **personal settings**. They do not affect which tracks are selected — the track list is fixed by the path alone. Two players with different query params on the same URL hear identical tracks.

When the query parameters are absent, the app shows a settings screen first (see section 10.2).

## 14.3 Admin Routes

Admin routes are under `/admin/*` and are never linked from the public-facing application.

## 14.4 Invalid URLs

If a quiz URL contains an invalid category slug or an unrecognized difficulty character, the app redirects to the home page. No error message is shown — the player simply lands on the home screen to start a new quiz.

## 14.5 Why This Split

- The **shareable part** is as short and typeable as possible.
- Personal preferences travel with each player's session, not with the quiz itself.
- The quiz identity can be announced verbally, posted as a short link, or typed on a phone without error.

---

# 15. Shareability & Social Features

**Core principle: every quiz is a URL.**

Design requirements:

- Quiz URLs are human-copyable and short enough to share in a chat message
- Open Graph and Twitter Card metadata is set on the quiz page so shared links render correctly in social media and messaging apps
- The results screen prominently surfaces a "Copy quiz link" action

Future possibilities:

- Twitch/YouTube integration (e.g. stream overlay showing the current round)
- Community quiz sharing (curated seeds with names)
- Daily challenge (a fixed daily seed published on the home screen)

---

# 16. Mobile Design

The app is designed mobile-first. All interactions must work well on a phone screen.

Requirements:

- Responsive layout (single-column on small screens)
- Touch-friendly controls: large tap targets, no hover-only interactions
- Autocomplete must not obscure the audio player on small screens
- Audio playback must work on iOS and Android (gesture-triggered)
- The share / copy link action must work with the mobile clipboard API

Accessibility is addressed on a **best-effort basis**:

- Semantic HTML elements for structure and navigation
- ARIA labels on interactive controls (audio player, autocomplete, buttons)
- Keyboard navigability for all quiz interactions
- Sufficient color contrast for track status indicators

---

# 17. Future Extensions

### Multiplayer

- Shared rooms where multiple players answer the same quiz simultaneously
- Synchronized playback
- Live leaderboard per session

### Persistent Leaderboards

- Daily quiz rankings per category
- Category high scores

### Content Expansion

- More categories
- Community track submissions
- Difficulty review and re-rating system

### Analytics

- Category popularity, completion rates, average score distribution per category
- Surfaced in the admin panel

---

# 18. Success Metrics

Key indicators for evaluating the product:

| Metric | What it shows |
| --- | --- |
| Quiz completion rate | Whether players finish a full quiz |
| Share link usage | How often quizzes are shared |
| Repeat play sessions | Whether players return for more |
| Average score distribution | Whether difficulty balance is appropriate |
| Category popularity | Which categories attract the most play |
