# Auth requirements quality checklist: Passkey registration and login

**Purpose**: Unit-test the **written requirements** (spec/plan) for
completeness, clarity, consistency, and measurability—not implementation
behavior.\
**Created**: 2026-03-29\
**Feature**: [spec.md](../spec.md) · [plan.md](../plan.md)\
**Context**: `tasks.md` is present under this feature folder; plan and contracts
inform gaps.

## Requirement completeness

- [x] CHK001 Are **all** authenticated surfaces that depend on session state
      explicitly covered or clearly excluded (e.g. quiz play vs account vs
      admin)? [Completeness, Spec FR-000, Gap]
- [x] CHK002 Are requirements sufficient to distinguish **public registration**
      from **add passkey while logged in** without ambiguity about which rules
      apply to each flow? [Completeness, Spec FR-001 vs FR-005]
- [x] CHK003 Is it documented whether **guest** users may access account
      management, or only authenticated users, for every entry path from home?
      [Completeness, Spec FR-007, Gap]
- [x] CHK004 Are requirements explicit about **what data** may live in
      session-scoped storage versus user/passkey tables? [Completeness, Spec Key
      Entities Session, Gap]
- [x] CHK005 Are **non-goals** (account deletion, extra username rules, scores)
      cross-referenced so new requirements are not invented ad hoc during
      implementation? [Completeness, Spec Non-Goals]

## Requirement clarity

- [x] CHK006 Is **“discoverable passkeys”** tied to objective acceptance
      language (e.g. no username field on login) so the requirement is not
      confused with allow-list authentication? [Clarity, Spec FR-002, User Story
      2]
- [x] CHK007 Is **“clear feedback”** on invalid username length defined in
      measurable terms (e.g. blocking submit vs inline message) or left
      intentionally open—and is that openness acceptable? [Clarity, Spec User
      Story 1 scenario 2, Ambiguity]
- [x] CHK008 Is **“development mode”** for relaxing **Secure** on cookies
      defined with criteria that align across spec Assumptions and FR-004?
      [Clarity, Spec FR-004, Assumptions]
- [x] CHK009 Is **“account management surface”** bounded so readers know which
      routes or UI group counts as that surface for FR-009? [Clarity, Spec
      FR-009, Gap]
- [x] CHK010 Does the spec define what **“denied”** means for non-admin users on
      admin routes (HTTP status vs redirect vs empty state) at the requirements
      level? [Clarity, Spec User Story 3 scenario 1, Gap]

## Requirement consistency

- [x] CHK011 Do **FR-009** (logout only on account management) and **User Story
      4** scenario 3 state the same placement constraint without implying a
      global logout affordance? [Consistency, Spec FR-009, User Story 4]
- [x] CHK012 Are **FR-006** (read-only admin flag) and **Non-Goals** (no admin
      assignment logic) free of wording that could imply a hidden bootstrap
      story? [Consistency, Spec FR-006, Non-Goals]
- [x] CHK013 Are **session lifecycle** expectations consistent between Edge
      Cases (expired cookie, unknown id) and Success Criteria SC-006?
      [Consistency, Spec Edge Cases, SC-006]
- [x] CHK014 Does **Constitution Alignment** contradict or duplicate **FR-008**
      in a way that could confuse “first middleware” vs generic “before
      handlers” wording? [Consistency, Spec FR-008, Constitution Security]

## Acceptance criteria quality

- [x] CHK015 Are **SC-002** and **SC-003** “100%” claims tied to defined
      populations (which login attempts count as “successful”; which admin
      attempts count)? [Measurability, Spec SC-002, SC-003]
- [x] CHK016 Is **SC-001**’s “under 3 minutes” scoped to a defined **compatible
      device** baseline referenced in requirements? [Measurability, Spec SC-001,
      Assumptions]
- [x] CHK017 Can **SC-005** be applied when more than two passkeys exist, or do
      requirements need an explicit rule for which credentials must be
      alternated? [Measurability, Spec SC-005, Key Entities Passkey]
- [x] CHK018 Is **SC-006**’s “protected pages” enumerated or definable from
      requirements alone? [Measurability, Spec SC-006, Gap]
- [x] CHK019 Does **SC-004** assume the user is already logged in, and is that
      precondition explicit alongside the “two actions” rule? [Measurability,
      Spec SC-004]

## Scenario coverage

- [x] CHK020 Are **alternate** flows documented for users who start login before
      registering (requirements quality, not app behavior)? [Coverage, Spec User
      Story 2 scenario 2, Gap]
- [x] CHK021 Are **recovery** requirements defined if the user loses all
      passkeys, or is that absence explicitly out of scope? [Coverage, Gap,
      Assumption]
- [x] CHK022 Are requirements clear for **partial registration** cleanup (User
      Story 1 scenario 3) versus **add passkey** mid-flow failure (Edge Cases)?
      [Coverage, Spec User Story 1, Edge Cases]

## Edge case coverage

- [x] CHK023 Are **concurrent sessions** requirements explicit enough to judge
      whether “logout elsewhere” is intentionally undefined beyond the default?
      [Edge case clarity, Spec Edge Cases concurrent sessions]
- [x] CHK024 Is **admin flag change mid-session** specified with a single
      authoritative rule (e.g. always re-read from DB) in requirements text, not
      only implied? [Edge case clarity, Spec Edge Cases admin flag]
- [x] CHK025 Are **unknown session cookie** requirements aligned with “no crash”
      and security (no information leakage) at the requirements level? [Edge
      case completeness, Spec Edge Cases cookie unknown id]

## Non-functional requirements (as specified)

- [x] CHK026 Are **accessibility** expectations for passkey-driven flows
      documented beyond Constitution (labels, errors, focus), or only at
      constitution level? [NFR completeness, Spec Mobile & Accessibility,
      Constitution]
- [x] CHK027 Are **cookie attribute** requirements complete relative to common
      omissions (e.g. **Path**, **Max-Age**/expiry relationship to session row)?
      [NFR completeness, Spec FR-004, Gap]
- [x] CHK028 Is **session expiry** sufficiently specified for stakeholders to
      reason about “logged out” vs “invalid cookie” without implementation
      detail? [NFR clarity, Spec Assumptions session expiry, Edge Cases]

## Dependencies and assumptions

- [x] CHK029 Are **username uniqueness** assumptions and duplicate-username UX
      expectations documented clearly enough to avoid conflicting
      interpretations between product and engineering? [Assumption, Spec
      Assumptions username uniqueness, FR-001]
- [x] CHK030 Is reliance on **passkey-capable browsers** stated as a hard
      dependency with acceptable fallback messaging requirements? [Dependency,
      Spec Assumptions passkey support]
- [x] CHK031 Does the spec tie **plan/contracts** path names and payloads as
      informative only, or should requirements explicitly reference API
      contracts for traceability? [Traceability, Plan contracts/README.md, Gap]

## Ambiguities and conflicts

- [x] CHK032 Is the phrase **“clear failure or guidance”** on login (User Story
      2) specific enough to avoid inconsistent copy/UX interpretations across
      platforms? [Ambiguity, Spec User Story 2 scenario 2]
- [x] CHK033 Could **“at most two navigational actions”** (SC-004) conflict with
      any future requirement to interpose interstitials (e.g. terms)—and is that
      boundary noted? [Conflict risk, Spec SC-004, Future scope]

## Notes

- Check items off as completed: `[x]`
- Failing items indicate **spec/plan edits**, not code fixes
- Re-run after major spec amendments
