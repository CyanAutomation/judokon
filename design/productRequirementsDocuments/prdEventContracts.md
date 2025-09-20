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

## Event Inventory (starter)

| Event name | Emitter | Primary consumers | Payload schema (path) | Owner |
|------------|---------|-------------------|-----------------------|-------|
| `battle:round-start` | Battle Engine | UI, CLI, tests | `design/dataSchemas/events/battle.round-start.schema.json` | Battle Engine |
| `battle:stat-selected` | UI / CLI | Battle Engine, tests | `design/dataSchemas/events/battle.stat-selected.schema.json` | Classic Battle UI |
| `battle:round-resolved` | Battle Engine | UI, scoreboard, tests | `design/dataSchemas/events/battle.round-resolved.schema.json` | Battle Engine |

Owners must keep this table current. Add new events with a short rationale and acceptance tests.

## Sample Event Payload Schemas

`design/dataSchemas/events/battle.round-start.schema.json` (example)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "battle:round-start",
  "type": "object",
  "required": ["roundNumber", "playerIds"],
  "properties": {
    "roundNumber": { "type": "integer", "minimum": 1 },
    "playerIds": { "type": "array", "items": { "type": "string" }, "minItems": 2, "maxItems": 2 },
    "seed": { "type": "integer" }
  },
  "additionalProperties": false
}
```

`design/dataSchemas/events/battle.stat-selected.schema.json` (example)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "battle:stat-selected",
  "type": "object",
  "required": ["playerId", "statKey", "timestamp"],
  "properties": {
    "playerId": { "type": "string" },
    "statKey": { "type": "string" },
    "timestamp": { "type": "string", "format": "date-time" },
    "context": { "type": "object" }
  },
  "additionalProperties": false
}
```

`design/dataSchemas/events/battle.round-resolved.schema.json` (example)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "battle:round-resolved",
  "type": "object",
  "required": ["tie", "details"],
  "properties": {
    "winnerId": { "type": ["string", "null"] },
    "tie": { "type": "boolean" },
    "details": { "type": "object" }
  },
  "additionalProperties": false
}
```

## Versioning and Deprecation Rules for Events

- Non-breaking (minor) changes: adding optional fields, loosening formats. No immediate consumer action required but must be announced.
- Breaking (major) changes: removing/renaming required fields or changing semantics — require PRD update, migration plan, and a compatibility period where both old and new payloads are produced (if feasible).

Process:

1. Update `prdEventContracts.md` with rationale and migration approach.
2. Add schema change and consumer contract tests in the same PR.
3. For breaking changes, emit both old and new event shapes for at least one release cycle and include telemetry to monitor consumer errors.

## Consumer Test Guidance

Provide lightweight consumer tests that validate event payloads in CI. Example (Node/Jest pseudo-code):

```js
import Ajv from 'ajv';
import roundStartSchema from '../../design/dataSchemas/events/battle.round-start.schema.json';

test('round-start event matches schema', () => {
 const ajv = new Ajv();
 const validate = ajv.compile(roundStartSchema);
 const sample = { roundNumber: 1, playerIds: ['p1','p2'] };
 expect(validate(sample)).toBe(true);
});
```

Acceptance Criteria (tests):

- Each P1 event has at least one consumer test that validates schema adherence in CI.

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
