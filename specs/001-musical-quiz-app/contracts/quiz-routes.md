# Contract: Quiz Routes

## Purpose

Define the route-level contract for public quiz creation, loading, and
player-local settings.

## `GET /`

### Purpose

Render the home screen with available categories and quiz start controls.

### Server Responsibilities

- Load category availability from the database based on eligible track counts
- Render only category+difficulty combinations with at least 20 eligible tracks
  as available choices
- Do not precompute a quiz until the player starts one

### Rendered UI Requirements

- Category selector that only offers category+difficulty combinations with at
  least 20 eligible tracks
- Difficulty selector (`easy`, `hard`, `mixed`)
- Start action

## `GET /quiz/{category}/{slug}`

### Path Parameters

| Name       | Type     | Notes                                     |
| ---------- | -------- | ----------------------------------------- |
| `category` | `string` | Category slug                             |
| `slug`     | `string` | Difficulty prefix + seed, e.g. `m8f3k9p2` |

### Query Parameters

| Name    | Type     | Required | Notes                             |
| ------- | -------- | -------- | --------------------------------- |
| `limit` | `number` | No       | Replay limit; `0` means unlimited |

### Successful Response Behavior

- Validate `category` against stored categories
- Decode `slug` into difficulty + seed
- Select the ordered 20-track quiz deterministically on the server
- Load category-scoped title suggestions
- Render the quiz shell and hydrate only the interactive islands needed for the
  current screen

### Redirect Behavior

- Redirect to `/` when the category slug does not exist
- Redirect to `/` when the slug cannot be decoded into a supported difficulty
  and seed

### Rendered Data Shape

```json
{
  "category": {
    "id": "category-id",
    "name": "Disney",
    "slug": "disney"
  },
  "identity": {
    "categorySlug": "disney",
    "difficulty": "mixed",
    "seed": "8f3k9p2"
  },
  "settings": {
    "replayLimit": 3
  },
  "tracks": [
    {
      "id": "track-id",
      "title": "Wall-E",
      "audioUrl": "/static/audio/walle.mp3",
      "difficulty": "easy"
    }
  ],
  "titleSuggestions": ["Wall-E", "Up", "Frozen"]
}
```

## Settings Gate Behavior

When the quiz route has no personal-settings query parameters:

- Show a settings gate before the quiz starts
- Collect replay limit
- Update the current URL with query parameters
- Preserve the same quiz identity and track list

## Results-Screen Behavior

When all tracks have been answered:

- Show final score
- Show a per-track summary
- Expose a copy-link action that copies the bare path only
- Expose a play-again action that regenerates a new seed for the same
  category+difficulty

## Availability Rule

- Category+difficulty combinations with fewer than 20 eligible tracks must not
  be offered as available quiz options on `/`.
- If a request somehow reaches `/quiz/{category}/{slug}` for an unavailable
  category+difficulty combination, the route should fail safely by redirecting
  to `/`
