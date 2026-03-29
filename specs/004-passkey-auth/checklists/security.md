# Security requirements quality checklist: Passkey registration and login

**Purpose**: Evaluate whether **security-related requirements** in the spec/plan
are complete, clear, consistent, and measurable—**not** whether the running app
passes penetration tests.\
**Created**: 2026-03-29\
**Feature**: [spec.md](../spec.md) · [plan.md](../plan.md)\
**User focus**: Security (explicit)

## Session and cookie requirements

- [x] CHK001 Are **session identifier** exposure constraints documented (e.g.
      cookie vs URL vs response body) with enough precision to avoid ambiguous
      “session in browser” wording? [Completeness, Spec FR-003, FR-004]
- [x] CHK002 Is the **HttpOnly + SameSite=Strict + Secure (non-dev)** rule
      stated without leaving **Path**, expiry alignment, or clearing behavior
      undefined at the requirements level? [Clarity, Gap, Spec FR-004]
- [x] CHK003 Are requirements consistent on **when Secure is optional** versus
      when the session is still considered acceptably protected? [Consistency,
      Spec FR-004, Assumptions dev mode]
- [x] CHK004 Is **invalid or unknown session id** handling specified in security
      terms (e.g. no authentication, no sensitive differentiation) not only as
      “no crash”? [Completeness, Spec Edge Cases cookie unknown id]
- [x] CHK005 Does the spec tie **server-side session invalidation on logout** to
      requirements in a way that excludes “client-only logout” interpretations?
      [Clarity, Spec FR-009, SC-006]

## Authentication and WebAuthn requirements

- [x] CHK006 Are **discoverable credential** expectations written so they
      cannot be read as permitting a weaker login mode (e.g. username-based
      allow-list) without an explicit non-goal? [Clarity, Spec FR-002]
- [x] CHK007 Are **challenge / assertion** lifecycle requirements documented at
      the product level (TTL, one-time use, binding to user action), or is that
      intentionally deferred with a visible gap? [Gap, Plan research WebAuthn
      challenges]
- [x] CHK008 Are requirements explicit about **what must never be sent to the
      client** (private keys, raw session rows, other users’ data) beyond generic
      constitution language? [Completeness, Spec Constitution Security, Gap]
- [x] CHK009 Is **credential counter / replay** concern reflected in
      requirements quality (or accepted as implementation-only) with a stated
      assumption? [Assumption, Gap, Plan lib/auth patterns]

## Authorization and admin boundary

- [x] CHK010 Are **admin-only resources** defined broadly enough that new `/admin`
      routes cannot bypass requirements silently? [Completeness, Spec User Story
      3, Constitution Passkey-Secured Administration]
- [x] CHK011 Is the **two-step** model (authenticated **and** admin flag)
      unambiguous relative to “protected pages” in SC-006? [Consistency, Spec
      FR-006, SC-006]
- [x] CHK012 Are requirements clear that **admin promotion/revocation** is out
      of scope **without** implying absence of **enforcement** when the flag is
      true? [Clarity, Spec FR-006, Non-Goals]
- [x] CHK013 Is **privilege read on each request** (vs cached admin in session
      only) specified clearly enough to resolve the Edge Case “admin flag
      changes mid-session”? [Clarity, Spec Edge Cases admin flag, FR-008]

## Abuse, misuse, and error disclosure

- [x] CHK014 Are **authentication failure** requirements written to limit
      ambiguous “clear guidance” that could over-share internals (e.g. valid
      user vs invalid credential)? [Clarity, Spec User Story 2 scenario 2,
      Ambiguity]
- [x] CHK015 Are **rate limiting / brute-force** expectations documented or
      explicitly excluded as non-goals for this feature? [Gap, NFR security]
- [x] CHK016 Are **registration abuse** dimensions (mass signups, duplicate
      usernames allowed) acknowledged for security-relevant ambiguity? [Assumption,
      Spec FR-001, Assumptions uniqueness]

## Data and persistence requirements

- [x] CHK017 Does the spec define **what identity fields** are considered
      sensitive in logs, support, and error surfaces—or is that a deliberate
      omission? [Gap, Spec Key Entities]
- [x] CHK018 Are **session row contents** (optional JSON) constrained in
      requirements so sensitive data cannot be justified by omission? [Gap, Plan
      data-model sessions.data]
- [x] CHK019 Are **migration / legacy session** security expectations documented
      when replacing prior cookie schemes, or left to plan-only? [Traceability,
      Plan Summary, Gap]

## Cross-document consistency

- [x] CHK020 Do **constitution** admin passkey/session expectations conflict with
      **FR-009** placement of logout (e.g. admin pages historically offering
      logout) at the requirements level? [Conflict risk, Constitution IV, Spec
      FR-009]
- [x] CHK021 Are **contracts** security-relevant fields (Set-Cookie, error
      bodies) aligned with spec FR-004/FR-009 without inventing obligations not
      in the spec? [Consistency, contracts/README.md, Spec FR-004]

## Acceptance criteria (security angle)

- [x] CHK022 Can **SC-003** be evaluated without a written definition of
      “admin area” scope and “denial” semantics? [Measurability, Spec SC-003]
- [x] CHK023 Does **SC-006** avoid relying on undefined “protected pages” for
      security sign-off? [Measurability, Spec SC-006, Gap]

## Dependencies and assumptions

- [x] CHK024 Is reliance on **RP ID / origin** configuration documented as a
      security assumption in requirements, or only in engineering docs?
      [Dependency, Gap, Plan quickstart env]
- [x] CHK025 Is **TLS in production** assumed implicitly by Secure cookies without
      a requirement tying deployment to HTTPS? [Assumption, Spec FR-004, Gap]

## Ambiguities and conflicts

- [x] CHK026 Could **“sessions table”** be satisfied by a non-DB store without
      violating stakeholder intent, creating a security/traceability gap?
      [Ambiguity, Spec FR-003]
- [x] CHK027 Is **“first middleware”** session persistence required in spec in
      terms that security reviewers can trace to session fixation or double-send
      issues, or is that solely architectural? [Ambiguity, Spec FR-008,
      Constitution]

## Notes

- Items address **requirement text quality**; failing items → edit **spec/plan**,
  not code first
- Mark done with `[x]` when reviewed
