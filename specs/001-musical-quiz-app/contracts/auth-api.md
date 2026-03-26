# Contract: Auth API

## Purpose

Define the passkey registration and authentication endpoints used by the admin
experience.

## `GET /api/auth/register`

Returns public-key creation options for bootstrapping or registering a passkey
for an existing admin user.

### Query Parameters

| Name          | Type     | Required | Notes                                               |
| ------------- | -------- | -------- | --------------------------------------------------- |
| `adminUserId` | `string` | Yes      | Existing admin identity to attach the credential to |

### Response `200`

```json
{
  "challenge": "base64url-challenge",
  "rp": {
    "name": "Musical Quiz App",
    "id": "localhost"
  },
  "user": {
    "id": "admin-user-id",
    "name": "admin",
    "displayName": "admin"
  },
  "pubKeyCredParams": [
    { "type": "public-key", "alg": -7 }
  ],
  "timeout": 300000
}
```

## `POST /api/auth/register`

Verifies the attestation response and persists the credential.

### Request Body

```json
{
  "adminUserId": "admin-user-id",
  "credential": {
    "id": "credential-id",
    "rawId": "base64url",
    "response": {
      "clientDataJSON": "base64url",
      "attestationObject": "base64url"
    },
    "type": "public-key"
  }
}
```

### Response `201`

```json
{
  "ok": true,
  "adminUserId": "admin-user-id",
  "credentialId": "credential-id"
}
```

### Failure Conditions

- `400` when the challenge is missing, expired, or malformed
- `401` when attestation verification fails
- `404` when the referenced admin user does not exist

## `GET /api/auth/authenticate`

Returns public-key request options for admin sign-in.

### Response `200`

```json
{
  "challenge": "base64url-challenge",
  "timeout": 300000,
  "rpId": "localhost",
  "userVerification": "preferred"
}
```

## `POST /api/auth/authenticate`

Verifies the assertion response, increments the stored counter, and issues a
session cookie.

### Request Body

```json
{
  "credential": {
    "id": "credential-id",
    "rawId": "base64url",
    "response": {
      "clientDataJSON": "base64url",
      "authenticatorData": "base64url",
      "signature": "base64url",
      "userHandle": null
    },
    "type": "public-key"
  }
}
```

### Response `200`

```json
{
  "ok": true,
  "adminUser": {
    "id": "admin-user-id",
    "username": "admin"
  }
}
```

### Response Headers

- `Set-Cookie`: signed admin session cookie with `HttpOnly`, `Secure` (when not
  in dev mode), and `SameSite=Strict`

### Failure Conditions

- `400` when the challenge is missing or expired
- `401` when the assertion does not verify
- `404` when the credential is unknown

## Security Requirements

- Challenges must be single-use and short-lived
- Passwords are never accepted or stored
- The credential counter must be updated on successful assertion verification
- Admin session cookies must be invalidated on logout
