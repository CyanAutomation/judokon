# Event Contracts PRD

## TL;DR

Defines the canonical event names, payload schemas, emitters, consumers, and versioning policy used across JU-DO-KON!. Tests, the CLI, and integrations rely on these events; this document is the single source of truth.

## Problem Statement / Why it matters

Event names and payloads are often used as implicit contracts between modules. Without explicit documentation and a versioning plan, changes break tests and third-party integrations.

## Goals / Success Metrics

- Publish a discoverable inventory of events with payload schemas.
- Define a versioning and deprecation policy for event changes.
- Reduce test breakages due to event changes to near zero by requiring PRD sign-off for breaking changes.

## User Stories

- As a test author, I want stable event names so Playwright tests don't flake.
- As an integration consumer, I want payload schemas so I can parse events reliably.

## Prioritized Functional Requirements

P1 - Event Inventory: A table listing event name, emitter, primary consumers, payload schema reference, and owner.

Acceptance Criteria:

- The table is populated and included in this PRD.

P1 - Payload Schemas: Define JSON schema (or TypeScript types) for each event payload.

Acceptance Criteria:

- At least P1 events include schema examples and sample payloads.

P2 - Versioning Policy: Define breaking vs non-breaking changes and the release process (major/minor tagging, migration period).

Acceptance Criteria:

- A clear policy document exists with examples (e.g., adding optional field = minor, removing field = major + migration plan).

P2 - Consumer Contract Tests: Provide test snippets or helpers that validate event contract adherence in CI.

Acceptance Criteria:

- Example unit/integration tests exist or are referenced.

## Common Event Examples (starter list)

- `battle:round-start` – emitted by Battle Engine when a new round starts. Payload: `{ roundNumber: number, playerIds: [string, string] }`.
- `battle:stat-selected` – emitted when a player selects a stat. Payload: `{ playerId: string, statKey: string, timestamp: string }`.
- `battle:round-resolved` – emitted when round resolution completes. Payload: `{ winnerId?: string, tie: boolean, details: object }`.

## Non-Functional Requirements / Design Considerations

- Events must be idempotent where possible or include an idempotency key.
- Events should be small and serializable to JSON.

## Dependencies and Open Questions

- Cross-reference: `prdBattleEngine.md`, `prdBattleClassic.md`, and `prdTestingStandards.md`.
- Open question: Should events be namespaced with owner module (e.g., `engine:`) or product area (e.g., `battle:`)? Recommendation: use product area prefixes (e.g., `battle:`) with module ownership documented.
