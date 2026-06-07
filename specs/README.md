# Specs

Subsystem-level specs for the Musical Quiz App (`fruiz`). Each numbered file
describes one piece of functionality end-to-end: its purpose, behavior, data
model, key code paths, invariants, and verification approach. Project-wide
standards (composition rules, signals-only client reactivity, verification
gates, etc.) live in [`../AGENTS.md`](../AGENTS.md).

## Index

| #  | Spec                                                                                     | Owns                                                                                |
| -- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 01 | [Product overview and game design](./01-product-overview-and-game-design.md)             | Concept, glossary, game loop, categories, difficulty, mobile UX baseline            |
| 02 | [Quiz identity and selection](./02-quiz-identity-and-selection.md)                       | Slug encoding, seeded PRNG, deterministic track selection, persisted quiz instances |
| 03 | [Audio playback and gain](./03-audio-playback-and-gain.md)                               | Audio file storage, listen URLs, clip windowing, playback-gain analysis             |
| 04 | [Quiz progress and replay](./04-quiz-progress-and-replay.md)                             | Local progress state, skip-advances flow, replay-limit gate                         |
| 05 | [Answer scoring and guess matching](./05-answer-scoring-and-guess-matching.md)           | Normalization, submission gating against the dataset, autocomplete suggestions      |
| 06 | [Player UI — audio player and visualizer](./06-player-ui-audio-player-and-visualizer.md) | AudioPlayer / AudioVisualizer islands, QuizController, glow tokens                  |
| 07 | [Player collections](./07-player-collections.md)                                         | Player-curated track collections, collection progress                               |
| 08 | [Account authentication and passkeys](./08-admin-authentication-and-passkeys.md)         | Public passkey registration, discoverable login, admin gate                         |
| 09 | [Admin content management](./09-admin-content-management.md)                             | Track / category CRUD, audio upload, music library scan                             |
| 10 | [Sessions and request lifecycle](./10-sessions-and-request-lifecycle.md)                 | Session middleware, cookie handling, logger, `ctx.state` shape                      |
| 11 | [Track suggestions and moderation](./11-track-suggestions.md)                            | Player track suggestion form, admin moderation queue, approve/deny with note        |
| 90 | [Roadmap](./90-roadmap.md)                                                               | Known future work and risks                                                         |

## Numbering

Two-digit zero-padded prefixes with intentional gaps so new specs can slot
between existing ones without renumbering. `01..10` cover currently-modelled
subsystems; `11..89` are reserved for future subsystems; `90+` is reserved for
meta documents like the roadmap.

## Adding a new spec

1. Copy [`_template.md`](./_template.md) to the next free numbered slot.
2. Fill every section. Leave a section out only if it truly does not apply.
3. List the `Key files` against paths that exist in the repo _today_; do not
   reference planned files.
4. Update the index table above.
5. If the new spec changes a rule that lives in `AGENTS.md`, update `AGENTS.md`
   in the same change.
