# Contracts: Auth & session HTTP API

**Feature**: `004-passkey-auth` | **Date**: 2026-03-29

**Canonical paths**: Implement these route names unless the spec is formally
changed; keep `tasks.md` T002 alignment checks against this file.

Base URL: same origin as the app. All JSON responses use `Content-Type:
application/json` unless noted.

**Legacy**: `GET/POST /api/auth/register?adminUserId=` is **deprecated** after
the `users` migration; public registration uses **`register-public`** below.

## Public registration

### `GET /api/auth/register-public`

**Query**: `username` (string, required for **new** user registration flow).

**Response 200**: `{ "challengeId": string, "options": PublicKeyCredentialCreationOptionsJSON }`

**Errors**: `400` invalid username length; `500` server error.

**Note**: Replaces legacy `GET /api/auth/register?adminUserId=` for new work.

### `POST /api/auth/register-public`

**Body**: `{ "challengeId": string, "username": string, "credential": ... }`

**Response 201**: `{ "ok": true, "userId": string }`  
**Set-Cookie**: Session cookie (HttpOnly, SameSite=Strict, Secure per env).

**Errors**: `400` bad input / challenge; `401` verification failed.

## Add passkey (authenticated)

### `GET /api/auth/register-add-passkey`

**Auth**: Valid session cookie.

**Response 200**: `{ "challengeId": string, "options": ... }`

**Errors**: `401` if not logged in.

### `POST /api/auth/register-add-passkey`

**Body**: `{ "challengeId": string, "credential": ... }`

**Response 201**: `{ "ok": true, "credentialId": string }`

## Discoverable login

### `GET /api/auth/authenticate`

**Response 200**: `{ "challengeId": string, "options": PublicKeyCredentialRequestOptionsJSON }`  
Options MUST support **discoverable** credentials (no fixed allow list).

**Errors**: `404` if no passkeys exist globally (optional message); `500` server.

### `POST /api/auth/authenticate`

**Body**: `{ "challengeId": string, "credential": ... }`

**Response 200**: `{ "ok": true, "user": { "id": string, "username": string, "admin": boolean } }`  
**Set-Cookie**: Session cookie.

**Errors**: `400` / `401` / `404` as today with stable `{ "error": string }` body.

## Logout

### `POST /api/auth/logout`

**Behavior**: Invalidate **DB session** for cookie id; clear cookie (Max-Age=0).

**Response**: `200` JSON `{ "ok": true }` **or** `302` redirect (legacy); spec
prefers account-management–initiated logout—JSON is enough for island `fetch`.

## Session cookie (normative attributes)

- **HttpOnly**: yes  
- **SameSite**: Strict  
- **Secure**: yes when not dev (same rule as `FRUIZ_SECURE_COOKIES` or project
  convention)  
- **Path**: `/`  
- **Name**: implementation-defined constant

## Internal (not public API)

- **`ctx.state`**: Populated by first session middleware with guest or
  `{ sessionId, user }` snapshot; handlers may mutate session-backed fields for
  middleware to persist.
