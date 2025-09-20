# Code Standards PRD

## TL;DR

This PRD consolidates developer-facing standards that affect product quality and public contracts: JSDoc/pseudocode requirements, testing standards, Playwright evaluation guidelines, and the rules agents must follow when changing public APIs. It references `design/codeStandards/` artifacts and codifies any sections that must be treated as product requirements.

## Problem Statement / Why it matters

Inconsistent code standards lead to unclear public API contracts, brittle tests, and reduced maintainability. Some code standard items are critical enough to be enforced as product-level requirements (for example: `@pseudocode` JSDoc on public functions and no dynamic imports in hot paths).

## Goals / Success Metrics

- Consolidate code standards that map to product-quality or contract requirements.
- Ensure AI agents and humans can detect and enforce the most important rules automatically (lint/CI checks).

## User Stories

- As a code reviewer, I want clear rules about public API documentation so I can enforce them consistently.
- As an AI agent, I want a machine-readable list of constraints (e.g., no `await import()` in hot paths).

## Prioritized Functional Requirements

P1 - Public API Documentation Rule: All public functions must include `@pseudocode` in JSDoc and a short description of side-effects.

Acceptance Criteria:

- CI check or checklist references this rule; examples included.

P1 - Hot-path Import Rule: Hot-path files must use static imports; dynamic imports are allowed only for optional/large modules with a preload strategy.

Acceptance Criteria:

- A list of hot-path files is referenced and the rule is documented (see `design/productRequirementsDocuments/prdArchitecture.md` for hot-path guidance).

P2 - Test Quality Standards: Define minimal test coverage requirements for PRs touching public APIs (happy path + 1 edge case) and fake timer usage for time-sensitive logic.

Acceptance Criteria:

- The testing standards are referenced; example tests and required patterns are included.

P2 - Playwright/E2E Conventions: Document selector strategy and avoidance of direct DOM manipulation in tests.

Acceptance Criteria:

- Playwright guidance exists and links to `playwright/` fixtures and example tests.

## Non-Functional Requirements / Design Considerations

- CI must run linters and test suites on PRs that touch public APIs.
- Static analysis should flag missing `@pseudocode` tags or dynamic imports in hot paths.

## Dependencies and Open Questions

- Consolidates content from `design/codeStandards/*.md`.
- Open question: whether `@pseudocode` is required in private helper functions that are exported for testing only.
