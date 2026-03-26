# Musical Quiz App — Technical Architecture

This document covers the technical implementation details. For product and game design, see [DESIGN.md](DESIGN.md).

---

# 1. Technology Stack

| Layer | Technology |
| --- | --- |
| Runtime | Deno |
| Framework | Fresh 2.x |
| Router | Fresh file-system routing (SSR + islands) |
| Build tool | Vite (via `@fresh/plugin-vite`) |
| Styling | Tailwind CSS 4 |
| Language | TypeScript |
| ORM | Drizzle ORM |
| UI components | Preact + `@preact/signals` |
| Package manager | Deno (JSR + npm imports via `deno.json`) |

The application uses a **server-client architecture**. Fresh's handler functions and page components run data loading and quiz generation on the server. The client receives pre-computed state and handles interactivity through **islands** (Preact components that hydrate in the browser).

This means:
- Track data and selection logic are never shipped to the client bundle.
- The server computes the ordered track list and serializes it into the initial page response.
- Audio fragment URLs are resolved server-side before the component tree is rendered.
- Drizzle ORM handles all database access exclusively on the server.

---

# 2. Project Structure

```
components/         # shared Preact components (server-rendered, no hydration)
  quiz/
    QuizPlayer.tsx        # gameplay controller layout (server shell)
    AudioTrackPlayer.tsx  # audio player shell
    AnswerAutocomplete.tsx # answer input shell
    SettingsGate.tsx      # settings overlay shell
  admin/
    TrackForm.tsx         # add/edit track form
    CategoryForm.tsx      # add/edit category form
db/
  config.ts               # database connection config
  db.ts                   # Drizzle db instance
  schema.ts               # Drizzle table definitions
  relations.ts            # Drizzle relation definitions
islands/
  AudioPlayer.tsx         # interactive audio playback (hydrated)
  AnswerInput.tsx         # interactive autocomplete input (hydrated)
  QuizController.tsx      # quiz state machine (hydrated)
  AdminForms.tsx          # interactive admin CRUD forms (hydrated)
lib/
  selectTracks.ts         # seeded quiz generation (server-only)
  prng.ts                 # seeded PRNG (server-only)
  normalize.ts            # answer normalization (shared)
  slug.ts                 # difficulty-char ↔ difficulty encoding/decoding
  auth.ts                 # passkey registration/authentication helpers (server-only)
routes/
  index.tsx               # home / settings screen
  quiz/
    [category]/
      [slug]/
        index.tsx         # quiz screen (/quiz/disney/m8f3k9p2)
  admin/
    index.tsx             # admin dashboard (auth-gated)
    tracks/
      index.tsx           # track list
      new.tsx             # add track
      [id].tsx            # edit / delete track
    categories/
      index.tsx           # category list
      new.tsx             # add category
      [id].tsx            # edit / delete category
  api/
    auth/
      register.ts         # passkey registration endpoints
      authenticate.ts     # passkey authentication endpoints
assets/
  styles.css              # Tailwind CSS entry point
```

Files under `db/`, `lib/`, and route `handler` functions are **server-only** — they never appear in the client bundle.

---

# 3. Data Model

## 3.1 Track (Drizzle schema)

```ts
export const tracks = pgTable('tracks', {
  id:         text('id').primaryKey(),
  audioUrl:   text('audio_url').notNull(),
  title:      text('title').notNull(),
  difficulty: text('difficulty', { enum: ['easy', 'hard'] }).notNull(),
});
```

## 3.2 Category (Drizzle schema)

```ts
export const categories = pgTable('categories', {
  id:   text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
});
```

## 3.3 Track ↔ Category (many-to-many)

```ts
export const trackCategories = pgTable('track_categories', {
  trackId:    text('track_id').references(() => tracks.id),
  categoryId: text('category_id').references(() => categories.id),
});
```

A single track can belong to multiple categories. This join table is the authority for both quiz track selection and autocomplete title lists.

## 3.4 Admin Users

```ts
export const adminUsers = pgTable('admin_users', {
  id:          text('id').primaryKey(),
  username:    text('username').notNull().unique(),
  createdAt:   integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const passkeys = pgTable('passkeys', {
  id:               text('id').primaryKey(),
  adminUserId:      text('admin_user_id').references(() => adminUsers.id),
  credentialId:     text('credential_id').notNull().unique(),
  publicKey:        blob('public_key').notNull(),
  counter:          integer('counter').notNull().default(0),
  transports:       text('transports'),   // JSON-encoded string[]
  createdAt:        integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

## 3.5 Quiz Identity

These fields fully determine which tracks appear. They are encoded in the URL path.

```ts
interface QuizIdentity {
  seed: string;                          // short base-62 string, e.g. "8f3k9p2"
  categoryId: string;                    // category slug, e.g. "disney"
  difficulty: 'easy' | 'hard' | 'mixed';
}
```

The quiz always contains **20 tracks**. This is fixed and not part of the identity.

## 3.6 Quiz Settings

These are personal player preferences stored as query parameters; they do **not** affect track selection.

```ts
interface QuizSettings {
  replayLimit: number;  // max times a track can be replayed; 0 = unlimited
}
```

---

# 4. Data Storage

All track and category data is stored in a **database accessed exclusively through Drizzle ORM**. The database is never queried from client-side code; all reads happen inside Fresh route handlers.

```
db/schema.ts    — Drizzle table definitions
db/relations.ts — Drizzle relation definitions
db/db.ts        — Drizzle db instance (server-only)
db/config.ts    — database connection configuration
```

Route handlers query the database and pass only the resulting data to the page component as props. The client receives only the final serialized quiz result — never raw data or selection logic.

This separation means:
- Changing the database backend only affects files in `db/` and the query calls in handlers.
- No component or island code changes when the data layer changes.

---

# 5. Core Modules

## 5.1 `selectTracksForQuiz(identity: QuizIdentity): Promise<Track[]>`

Located in `lib/selectTracks.ts`. A **pure, deterministic function**: given the same inputs it always returns the same ordered track list. Runs **server-side only** inside a Fresh route handler.

Algorithm:

1. Query the database for all tracks belonging to `identity.categoryId`.
2. If `identity.difficulty !== 'mixed'`, filter to matching difficulty.
3. Seed the PRNG with `identity.seed`.
4. Shuffle the filtered pool using the seeded PRNG (Fisher-Yates).
5. Select the first 20 tracks from the shuffled pool.
6. Return the ordered list.

The personal `replayLimit` setting does **not** influence this function.

## 5.2 PRNG (`lib/prng.ts`)

A small seeded pseudo-random number generator (`mulberry32` or `splitmix32`) that accepts a numeric seed derived from the seed string. No external dependency required. Server-only.

Seed string → numeric seed conversion: a simple hash such as djb2 converts the seed string to a 32-bit integer.

## 5.3 Slug Encoding (`lib/slug.ts`)

Handles encoding and decoding the `[slug]` URL segment, packing difficulty and seed into a single short string.

```ts
// Encode: difficulty char + seed string
// e.g. difficulty='mixed', seed='8f3k9p2' → 'm8f3k9p2'
function encodeSlug(difficulty: 'easy' | 'hard' | 'mixed', seed: string): string

// Decode: split first char as difficulty, remainder as seed
function decodeSlug(slug: string): { difficulty: 'easy' | 'hard' | 'mixed'; seed: string }
```

Difficulty characters: `e` = easy, `h` = hard, `m` = mixed.

The seed portion is a **short base-62 string** (characters `0-9a-zA-Z`), 6–8 characters long. This gives 62⁶ ≈ 56 billion to 62⁸ ≈ 218 trillion possible values — enough entropy while remaining typeable on a phone.

## 5.4 Answer Normalization (`lib/normalize.ts`)

```ts
function normalizeAnswer(input: string): string
```

Applies to both the player's input and the correct title before comparison:

- Lowercase
- Trim whitespace
- Remove punctuation (`.`, `:`, `·`, `-`, `'`, etc.)
- Collapse multiple spaces to one

## 5.5 Passkey Auth (`lib/auth.ts`)

Server-only helpers that implement the [WebAuthn](https://www.w3.org/TR/webauthn-2/) protocol for passkey-based admin authentication.

Key responsibilities:

- **Registration flow:** generate a challenge, verify the authenticator's attestation response, and persist the new credential (`credentialId`, `publicKey`, `counter`) to the `passkeys` table.
- **Authentication flow:** generate a challenge, verify the assertion response against the stored public key, increment the stored `counter` (replay attack prevention), and issue a signed session cookie.
- **Session management:** a short-lived, `HttpOnly`, `Secure` session cookie identifies authenticated admin sessions. The session is validated on every admin route.

## 5.6 Module Responsibilities

| Module | Side | Responsibility |
| --- | --- | --- |
| `selectTracksForQuiz` | Server | Deterministic quiz generation |
| `slug.ts` | Shared | Encode/decode difficulty+seed path segment |
| `prng.ts` | Server | Seeded shuffle |
| `normalize.ts` | Shared | Answer string normalization |
| `auth.ts` | Server | Passkey registration, authentication, session management |
| `QuizController` (island) | Client | Gameplay state machine (current round, score, answers) |
| `AudioPlayer` (island) | Client | HTML5 audio element wrapper, gesture-safe play/pause |
| `AnswerInput` (island) | Client | Category-scoped autocomplete with normalization |
| `SettingsGate` | Client | Settings overlay shown when query params are absent |
| `AdminForms` (island) | Client | Interactive admin CRUD forms |

---

# 6. Routing

Fresh uses file-system routing. Each route file can export a `handler` (server-side) and a default page component (rendered to HTML on the server, with optional island hydration).

| File | Route | Purpose |
| --- | --- | --- |
| `routes/index.tsx` | `/` | Home screen (category + difficulty picker) |
| `routes/quiz/[category]/[slug]/index.tsx` | `/quiz/disney/m8f3k9p2` | Quiz screen |
| `routes/admin/index.tsx` | `/admin` | Admin dashboard (auth-gated) |
| `routes/admin/tracks/index.tsx` | `/admin/tracks` | Track list |
| `routes/admin/tracks/new.tsx` | `/admin/tracks/new` | Add track |
| `routes/admin/tracks/[id].tsx` | `/admin/tracks/:id` | Edit / delete track |
| `routes/admin/categories/index.tsx` | `/admin/categories` | Category list |
| `routes/admin/categories/new.tsx` | `/admin/categories/new` | Add category |
| `routes/admin/categories/[id].tsx` | `/admin/categories/:id` | Edit / delete category |
| `routes/api/auth/register.ts` | `/api/auth/register` | Passkey registration API |
| `routes/api/auth/authenticate.ts` | `/api/auth/authenticate` | Passkey authentication API |

## 6.1 Quiz Route Handler

The handler on the quiz route runs server-side, validates params, queries the database, and passes data to the page component as props:

```ts
// routes/quiz/[category]/[slug]/index.tsx
export const handler: Handlers<QuizPageData> = {
  async GET(req, ctx) {
    const { category, slug } = ctx.params;

    const cat = await getCategoryBySlug(category);
    if (!cat) return new Response(null, { status: 302, headers: { Location: '/' } });

    const decoded = decodeSlug(slug);
    if (!decoded) return new Response(null, { status: 302, headers: { Location: '/' } });

    const { difficulty, seed } = decoded;
    const tracks = await selectTracksForQuiz({ seed, categoryId: cat.id, difficulty });
    const titles = await getTitlesForCategory(cat.id);

    return ctx.render({ tracks, titles, category: cat, difficulty, seed });
  },
};
```

## 6.2 Admin Route Auth Guard

All `/admin/*` routes check for a valid session cookie before rendering. Unauthenticated requests are redirected to the login page:

```ts
// routes/admin/index.tsx (and all other admin routes)
export const handler: Handlers = {
  async GET(req, ctx) {
    const session = await validateSession(req);
    if (!session) {
      return new Response(null, { status: 302, headers: { Location: '/admin/login' } });
    }
    return ctx.render({ user: session.user });
  },
};
```

## 6.3 Home Route — Seed Generation

```ts
// routes/index.tsx (island or form submission)
function startQuiz(category: string, difficulty: Difficulty) {
  const seed = generateShortSeed();          // e.g. "8f3k9p2" (base-62, 7 chars)
  const slug = encodeSlug(difficulty, seed); // e.g. "m8f3k9p2"
  location.href = `/quiz/${category}/${slug}`;
}
```

---

# 7. Admin Panel

The admin panel is a server-rendered CRUD interface accessible only to authenticated admin users. It provides full management of the data that drives quiz generation.

## 7.1 Features

| Section | Operations |
| --- | --- |
| Tracks | List, add, edit, delete |
| Categories | List, add, edit, delete |
| Track ↔ Category assignments | Add / remove a track from a category |

## 7.2 Architecture

- All admin routes are under `/admin/*` and protected by a session auth guard (see §6.2).
- Forms use standard HTML `POST` actions handled by Fresh `handler` functions — no client-side fetch required for basic CRUD.
- Interactive elements (e.g. dynamic category assignment, preview audio) are implemented as islands.
- Drizzle ORM is used for all database mutations.

---

# 8. Authentication (Passkeys)

Admin access is protected by **passkey authentication** (WebAuthn). No passwords are stored.

## 8.1 Registration

Performed once per admin user, typically via a setup script or a one-time admin bootstrap route:

1. Server generates a `challenge` (random bytes) and returns it alongside `rp` (relying party) info.
2. The browser calls `navigator.credentials.create()` with the challenge.
3. The authenticator (Touch ID, Windows Hello, hardware key, etc.) creates a key pair and signs the challenge.
4. The browser sends the attestation response to `/api/auth/register`.
5. The server verifies the attestation, extracts `credentialId` and `publicKey`, and stores them in the `passkeys` table.

## 8.2 Authentication

1. Admin navigates to `/admin/login`.
2. Server generates a `challenge` and stores it in a short-lived server-side session.
3. The browser calls `navigator.credentials.get()` with the challenge.
4. The authenticator signs the challenge with the private key.
5. The browser sends the assertion response to `/api/auth/authenticate`.
6. The server verifies the signature against the stored public key, increments the `counter`, and issues a signed `HttpOnly` session cookie.
7. Subsequent requests to `/admin/*` are authenticated via this cookie.

## 8.3 Security Notes

- Challenges are single-use and expire after a short window (e.g. 5 minutes).
- The `counter` field prevents credential cloning (replay attacks).
- Session cookies are `HttpOnly`, `Secure`, and `SameSite=Strict`.
- No passwords or password hashes are stored anywhere in the system.

---

# 9. Performance Considerations

Track data and selection logic run server-side and are never sent to the browser, so client bundle size does not grow with the size of the track library. As the dataset grows:

- **Split by category**: query only the relevant category's data in the handler rather than loading all tracks at once (Drizzle makes this a simple `WHERE` filter).
- **Route-level code splitting**: Fresh handles this natively per island; only island JS for the current route is loaded.
- **Audio**: fragments are not bundled; they are fetched from a URL (local `/static` directory or CDN) on demand.
- **Autocomplete titles**: only the title list for the active category is sent to the client (from the handler), not all titles across all categories.

Fresh's SSR model means minimal JavaScript executes on initial load — only island components hydrate in the browser.

---

# 10. Open Graph / Social Meta

The quiz route sets `<head>` metadata for social sharing using Fresh's `<Head>` component:

```tsx
// routes/quiz/[category]/[slug]/index.tsx
<Head>
  <title>Musical Quiz — {category.name}</title>
  <meta name="description" content="Can you name the film, show, or game from the music?" />
  <meta property="og:title" content={`Musical Quiz — ${category.name}`} />
  <meta property="og:description" content="A shareable music quiz." />
  <meta property="og:url" content={canonicalUrl} />
  <meta name="twitter:card" content="summary" />
</Head>
```

A static OG image (e.g. `/static/og-image.png`) is used for all quiz pages in the initial release. Dynamic per-quiz images are a future extension.
