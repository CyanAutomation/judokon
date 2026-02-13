> **Scope:** Test author quickstart and local conventions.
> **When to read this:** Use when writing/updating tests quickly; for architecture and policy context start at the [Testing Documentation Hub](../docs/testing/INDEX.md).

# Test Author Quickstart

Use this file when writing or updating tests quickly.
For architecture decisions and durable policy, start with the canonical guide:

- **Canonical**: [`docs/TESTING_ARCHITECTURE.md`](../docs/TESTING_ARCHITECTURE.md)

## 1) Pick test type first

Use the canonical decision matrix:

- [Choosing the Right Test Type](../docs/TESTING_ARCHITECTURE.md#choosing-the-right-test-type)
- [DOM Strategy: Behavior First](../docs/TESTING_ARCHITECTURE.md#dom-strategy-behavior-first)

## 2) Apply the correct harness pattern

- Unit tests: [Unit Architecture Pattern (Vitest 3.x)](../docs/TESTING_ARCHITECTURE.md#unit-architecture-pattern-vitest-3x)
- Integration tests: [Integration Architecture Pattern](../docs/TESTING_ARCHITECTURE.md#integration-architecture-pattern)

## 3) Local author checklist

- Use top-level `vi.mock()` + `vi.hoisted()` for shared mocks.
- Import modules after `harness.setup()`.
- Prefer user-like interactions over direct DOM manipulation.
- Add at least one happy path and one edge case.
- Keep console discipline (`withMutedConsole` when needed).

## 4) Run targeted validation before commit

Use the canonical command section in the hub:

- [Testing Documentation Hub → Canonical Validation Command Reference](../docs/testing/INDEX.md#canonical-validation-command-reference)

For broader expectations and anti-patterns, see:

- [Anti-Patterns to Avoid](../docs/TESTING_ARCHITECTURE.md#anti-patterns-to-avoid)
- [Validation Expectations](../docs/TESTING_ARCHITECTURE.md#validation-expectations)
- [Migration Strategy](../docs/TESTING_ARCHITECTURE.md#migration-strategy)
