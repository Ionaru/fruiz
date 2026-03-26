# Data Model: Musical Quiz App MVP

## Domain Types

### Track

Represents one playable music fragment.

| Field        | Type               | Notes                                                         |
| ------------ | ------------------ | ------------------------------------------------------------- |
| `id`         | `string`           | Primary key, UUID-style identifier                            |
| `title`      | `string`           | Canonical answer title shown in admin and results             |
| `audioUrl`   | `string`           | Canonical fragment location or internally resolved asset path |
| `difficulty` | `'easy' \| 'hard'` | Admin-assigned recognition difficulty                         |

**Relationships**

- Many-to-many with `Category`

**Validation**

- `title` is required
- `audioUrl` is required
- `difficulty` must be `easy` or `hard`

### Category

Represents a named quiz pool and URL segment.

| Field  | Type     | Notes                                         |
| ------ | -------- | --------------------------------------------- |
| `id`   | `string` | Primary key                                   |
| `name` | `string` | Human-readable label                          |
| `slug` | `string` | Unique path-safe identifier used in quiz URLs |

**Relationships**

- Many-to-many with `Track`

**Validation**

- `name` is required
- `slug` is required and unique
- Deletion is allowed only when no track assignments remain
- A category+difficulty combination is selectable only when it has at least 20
  eligible tracks

### TrackCategory

Join entity linking tracks and categories.

| Field        | Type     | Notes                    |
| ------------ | -------- | ------------------------ |
| `trackId`    | `string` | References `Track.id`    |
| `categoryId` | `string` | References `Category.id` |

**Validation**

- Composite primary key on (`trackId`, `categoryId`)
- Both foreign keys are required

### AdminUser

Represents an authenticated admin identity.

| Field       | Type                | Notes                   |
| ----------- | ------------------- | ----------------------- |
| `id`        | `string`            | Primary key             |
| `username`  | `string`            | Unique admin identifier |
| `createdAt` | `Date` or timestamp | Audit field             |

### PasskeyCredential

Stores the public credential material needed to verify passkey logins.

| Field          | Type                | Notes                        |
| -------------- | ------------------- | ---------------------------- |
| `id`           | `string`            | Primary key                  |
| `adminUserId`  | `string`            | References `AdminUser.id`    |
| `credentialId` | `string`            | Unique credential identifier |
| `publicKey`    | `Uint8Array` / blob | Stored verifier key          |
| `counter`      | `number`            | WebAuthn signature counter   |
| `transports`   | `string[]`          | Serialized transport hints   |
| `createdAt`    | `Date` or timestamp | Audit field                  |

## Application Types

### QuizIdentity

This is the complete server-side key for deterministic selection.

```ts
interface QuizIdentity {
  categorySlug: string;
  difficulty: "easy" | "hard" | "mixed";
  seed: string;
}
```

**Rules**

- Encoded in the path `/quiz/{category}/{difficulty-char}{seed}`
- Same identity must yield the same ordered track list
- Must not contain player-local settings

### QuizSettings

Player-local preferences applied after quiz identity is known.

```ts
interface QuizSettings {
  replayLimit: number; // 0 = unlimited
}
```

**Rules**

- Stored in query parameters
- Must not affect selection or track order

### QuizProgress

Device-local saved state for one quiz path.

```ts
interface QuizProgress {
  quizPath: string;
  score: number;
  activeTrackIndex: number | null;
  tracks: Array<{
    trackId: string;
    status: "unanswered" | "skipped" | "correct" | "incorrect";
    selectedTitle: string | null;
    replayCount: number;
  }>;
}
```

**Rules**

- Stored in localStorage keyed by quiz path
- Two devices do not share progress
- Query parameter changes do not change the underlying selected tracks

### QuizPageData

Server-rendered payload for the quiz route.

```ts
interface QuizPageData {
  category: {
    id: string;
    name: string;
    slug: string;
  };
  identity: QuizIdentity;
  settings: QuizSettings | null;
  tracks: Array<{
    id: string;
    title: string;
    audioUrl: string;
    difficulty: "easy" | "hard";
  }>;
  titleSuggestions: string[];
}
```

**Rules**

- Contains the minimum payload needed to render and hydrate the quiz screen
- Does not expose unrelated categories or full raw DB structures

## State Transitions

### Track Status

`unanswered -> skipped -> unanswered` `unanswered -> correct`
`unanswered -> incorrect` `skipped -> correct` `skipped -> incorrect`

Submitted answers are terminal for that track and cannot revert to `unanswered`
or `skipped`.

### Admin Session

`no session -> challenge issued -> verified session -> expired/cleared session`

## Schema Notes

- The current repo schema already models `Track`, `Category`, and
  `TrackCategory`, but it stores `fileName` instead of the design-doc field
  `audioUrl`. Implementation should normalize this discrepancy in the migration
  plan.
- `AdminUser` and `PasskeyCredential` tables must be added for the admin/auth
  scope described in the design and architecture docs.
- If quiz routes need fast lookup of all titles in a category, selection queries
  should reuse the same category membership data rather than duplicate
  denormalized title lists.
