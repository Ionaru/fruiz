# Requirements Quality Checklist: Submit gating (scoring-aligned)

**Purpose**: Unit tests for requirements writing—validate completeness, clarity,
consistency, and measurability of the submit-gating feature specs (not
implementation behavior).\
**Created**: 2025-03-26\
**Feature**: [spec.md](../spec.md) · [plan.md](../plan.md)

**Defaults applied** (no `/speckit.checklist` arguments): **Standard** depth,
**PR reviewer** audience, focus on **gating rules**, **equality semantics**, and
**spec/plan alignment**.

## Requirement Completeness

- [ ] CHK001 Are all constraints on **when** a guess may be submitted stated as
      mandatory requirements (not only narrative)? [Completeness, Spec
      §FR-002–FR-003]
- [ ] CHK002 Is it explicitly required that **quiz identity** and **track
      selection** remain unchanged by this feature? [Completeness, Spec §FR-000]
- [ ] CHK003 Are requirements stated for **every submission path** (not only the
      primary submit control)? [Completeness, Spec §FR-005]
- [ ] CHK004 Is the **comparison title set** defined as a requirement (full pool
      vs quiz subset) without relying only on informal examples? [Completeness,
      Spec §FR-001, Assumptions · Title set]
- [ ] CHK005 Are **post-submit scoring** expectations documented where gating
      differs from “correct for active track”? [Completeness, Spec §Edge Cases ·
      Title in full pool but not in current quiz]
- [ ] CHK006 Are **maintainability / single-definition** expectations for title
      matching captured as normative requirements (not only constitution notes)?
      [Completeness, Spec §Maintainability]

## Requirement Clarity

- [ ] CHK007 Is **“matches … under the scoring equality rules”** anchored to a
      documented, reviewable definition (or explicit deferral to a named product
      rule)? [Clarity, Spec §Assumptions · Title match definition]
- [ ] CHK008 Is **“clear”** submit affordance qualified so reviewers can judge
      compliance without subjective opinion? [Clarity, Ambiguity, Spec §FR-004,
      User Story 2]
- [ ] CHK009 Is **“full category suggestion pool”** defined in terms the spec
      owns (e.g. same as autocomplete/suggestions), not only product jargon?
      [Clarity, Spec §Assumptions · Title set]
- [ ] CHK010 Are **whitespace-only** and **empty** input requirements
      distinguishable and unambiguous after trimming rules? [Clarity, Spec
      §FR-003, User Story 1 · Scenario 3]
- [ ] CHK011 Does the spec define what **“stale invalid value”** means for rapid
      typing without implementation vocabulary? [Clarity, Spec §Edge Cases ·
      Rapid typing]

## Requirement Consistency

- [ ] CHK012 Do **User Story 1**, **FR-002**, and **Assumptions · Title match**
      describe the same equality semantics without conflict? [Consistency]
- [ ] CHK013 Do **FR-001** (full pool) and **Edge Cases · Title in full pool**
      tell a single coherent story about wrong-track submits? [Consistency]
- [ ] CHK014 Are **Success Criteria** aligned with **FR-002–FR-005** (no success
      metric that assumes a stricter gate than functional rules)? [Consistency,
      Spec §SC-001–SC-004, Spec §FR-002–FR-005]
- [ ] CHK015 Does **Out of scope** contradict any mandatory requirement
      elsewhere (e.g. implied scoring changes)? [Consistency, Spec §Assumptions
      · Out of scope]

## Acceptance Criteria Quality

- [ ] CHK016 Can **SC-001**’s “non-matching inputs” be operationalized from the
      written requirements alone? [Measurability, Spec §SC-001]
- [ ] CHK017 Is **SC-003**’s 90% threshold tied to a defined population and task
      (“infer availability from affordance alone”)? [Measurability, Spec
      §SC-003]
- [ ] CHK018 Does **SC-004** avoid overlap or tension with **SC-002** while
      remaining independently checkable? [Measurability, Consistency, Spec
      §SC-002, SC-004]
- [ ] CHK019 Are **Given/When/Then** scenarios free of undefined placeholders
      (“known set”) that block objective review? [Measurability, Spec §User
      Story 1 · Acceptance Scenarios]

## Scenario Coverage

- [ ] CHK020 Are **primary** flows (match → may submit, no match → may not)
      covered at requirement level without gaps? [Coverage, Spec §User Story 1]
- [ ] CHK021 Are **alternate** outcomes (valid pool title, incorrect for current
      track) specified as requirements-level behavior? [Coverage, Spec §Edge
      Cases · Title in full pool]
- [ ] CHK022 Are **exception / guard** requirements explicit for blocked
      submission when a path might bypass the UI affordance? [Coverage, Spec
      §FR-005]

## Edge Case Coverage

- [ ] CHK023 Are **duplicate titles** in the comparison set addressed without
      leaving ambiguous “which string wins”? [Edge Case, Spec §Edge Cases ·
      Duplicate titles]
- [ ] CHK024 Are **case / punctuation / spacing** equivalence requirements
      cross-referenced to the same pipeline as scoring (not duplicated with
      divergent wording)? [Edge Case, Consistency, Spec §Edge Cases · Titles
      that differ only by case…]
- [ ] CHK025 Is behavior specified (or intentionally deferred) when **scoring
      rules change** relative to gating? [Edge Case, Assumption, Spec
      §Assumptions · Title match definition]

## Non-Functional Requirements

- [ ] CHK026 Are **mobile and keyboard** expectations for the gated submit flow
      stated as requirements (not only validation evidence prose)?
      [Completeness, Spec §Mobile & Accessibility Validation]
- [ ] CHK027 Is **performance** of “updates while typing” treated as a
      requirement, plan-only detail, or explicitly out of scope? [Gap / Clarity,
      compare Spec vs Plan §Performance Goals]
- [ ] CHK028 Are **security / data boundary** requirements for this feature
      consistent with “no new corpus on client” and server-side scoring
      authority? [Consistency, Spec §Security & Data Boundaries]

## Dependencies & Assumptions

- [ ] CHK029 Is reliance on an **existing scoring normalization pipeline**
      documented as an assumption with clear consequences if that pipeline is
      undefined externally? [Assumption, Spec §Assumptions · Title match
      definition]
- [ ] CHK030 Are **dependencies** on “same pool as autocomplete” explicit enough
      that a documentation change elsewhere cannot silently invalidate the spec?
      [Dependency, Spec §Assumptions · Title set]

## Ambiguities & Conflicts

- [ ] CHK031 Does the spec resolve whether **“equivalent affordance”** may
      substitute for disabled controls, without leaving reviewer discretion
      unbounded? [Ambiguity, Spec §User Story 2]
- [ ] CHK032 Is **Constitution Alignment** material treated as informative
      context only, or does it duplicate normative requirements in a way that
      could conflict? [Conflict risk, Spec §Constitution vs §Requirements]

## Notes

- Check items off as reviewed: `[x]`
- This checklist does **not** replace implementation or QA test plans; it
  reviews **requirements text quality** only.
