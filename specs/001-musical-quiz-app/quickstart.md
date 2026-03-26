# Quickstart: Musical Quiz App MVP Validation

## Prerequisites

- Deno installed
- Project dependencies available through `deno.json`
- Seeded SQLite database with at least one category containing 20 eligible
  tracks
- At least one bootstrapped admin user with a registered passkey for admin-flow
  validation

## Setup

```powershell
deno task db:sync
deno task dev
```

Open the app in a browser after the dev server starts.

## Validation 1: Start and finish a quiz

1. Visit `/`.
2. Confirm the home screen shows only category+difficulty combinations that have
   at least 20 eligible tracks.
3. Start a quiz and verify the app navigates to
   `/quiz/{category}/{difficulty-char}{seed}`.
4. Verify 20 tracks are present in the overview.
5. Select a track, trigger audio playback with a user gesture, choose a title
   from autocomplete, and submit.
6. Skip at least one track, then return and answer it later.
7. Finish all tracks and verify the results screen shows score plus per-track
   outcomes.

## Validation 2: Deterministic sharing and player-local settings

1. Copy the bare quiz URL path from the results screen.
2. Open that path in a second browser profile or device.
3. Confirm both sessions load the same category, difficulty, and ordered track
   set.
4. Start one session with `?limit=1` and another with `?limit=3`.
5. Confirm replay behavior differs per player while the track order remains
   identical.

## Validation 3: Progress persistence

1. Begin a quiz and answer several tracks.
2. Refresh the page.
3. Confirm progress resumes from localStorage on the same device.
4. Open the same quiz in a different browser profile and confirm progress is not
   shared.

## Validation 4: Invalid quiz URLs

1. Open a quiz URL with an invalid category slug.
2. Open a quiz URL with an invalid difficulty prefix.
3. Confirm both requests redirect safely to `/`.

## Validation 5: Mobile UX

1. Use browser responsive mode or a real phone-sized device.
2. Confirm tap targets are large enough to use comfortably.
3. Confirm the autocomplete does not hide critical quiz controls.
4. Confirm audio playback starts only after an explicit gesture.
5. Confirm copy-link works with the browser clipboard on mobile.

## Validation 6: Admin authentication and CRUD

1. Visit `/admin` while signed out and confirm redirect to `/admin/login`.
2. Complete passkey authentication and confirm successful navigation to
   `/admin`.
3. Create a category, then create a track assigned to that category.
4. Edit the track and verify changes persist.
5. Attempt to delete a category that still has track assignments and confirm
   deletion is blocked.
6. Delete a track, then delete the now-unassigned category after confirming the
   destructive action.

## Automated Verification

Run these checks in addition to the manual flow above:

```powershell
deno fmt --check .
deno lint .
deno check
deno task test
```

## Server vs client boundaries (implementation notes)

- All SQLite access stays on the server (`db/`, `lib/`, route handlers). Islands
  only call JSON APIs and use `localStorage` for quiz progress.
- Passkey flows require a `challengeId` returned by `GET /api/auth/register` or
  `GET /api/auth/authenticate` and sent back with `POST` bodies alongside the
  WebAuthn `credential` payload (see `contracts/auth-api.md`).
- Quiz replay limits are parsed with `parseReplayLimitFromUrl` in
  `lib/categories.ts` on the quiz route; the home page ignores `limit` for quiz
  generation and shows a short notice if it is present.

## Environment variables (optional)

| Variable               | Purpose                                                                    |
| ---------------------- | -------------------------------------------------------------------------- |
| `FRUIZ_SESSION_SECRET` | HMAC key for the `fruiz_admin` cookie (defaults to an insecure dev value). |
| `FRUIZ_RP_ID`          | WebAuthn RP ID (defaults to `localhost`).                                  |
| `FRUIZ_RP_NAME`        | Display name for registration (defaults to `Musical Quiz`).                |
| `FRUIZ_SECURE_COOKIES` | Set to `1` to add the `Secure` flag on session cookies.                    |

## Bootstrap: first admin user (SQL example)

Create a row in `admin_users`, then open `/admin/login`, enter that user’s `id`
under **Admin user ID**, and choose **Register passkey**. Example (run against
your SQLite file, e.g. `quiz.db`):

```sql
insert into admin_users (id, username, created_at)
values (lower(hex(randomblob(16))), 'admin', strftime('%s','now') * 1000);
```

Copy the generated `id` from the database for the registration step.

## Category Availability Rule

- A category+difficulty combination with fewer than 20 eligible tracks must not
  appear as an available quiz option.
