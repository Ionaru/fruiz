# Contracts: 002-exact-title-guess

**Date**: 2025-03-26

No new **HTTP routes**, **JSON APIs**, or **database** contracts are introduced.

## Behavioral contract (client)

- **Input**: `answerDraft` string, `titleSuggestions: string[]` (from server
  render).
- **Submit enabled** iff `answerDraft.trim() !== ""` **and**\
  `∃ t ∈ titleSuggestions : normalizeAnswer(answerDraft) === normalizeAnswer(t)`.
- **Submit handler** must no-op (no progress mutation) when the above is false.

This contract is testable via unit tests on the pure predicate and via manual
checks in [quickstart.md](../quickstart.md).
