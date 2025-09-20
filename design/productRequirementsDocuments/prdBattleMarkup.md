# Battle Markup PRD

## TL;DR

This PRD defines the canonical DOM/markup contracts used by Classic Battle and related tools (CLI, tests, debug panels). It lists stable IDs, data attributes, and the responsibilities of the markup to support automation and accessibility.

## Problem Statement / Why it matters

Playwright tests, CLI clients, and automation rely on stable DOM hooks. If markup changes without coordination, tests and external tooling break. The markup must be a product-level contract.

## Goals / Success Metrics

- Enumerate stable DOM IDs and selectors used by tests and integrations.
- Define the policy for changing markup (deprecation window, test updates required).

## User Stories

- As a test author, I want stable IDs for querying elements.
- As a developer, I want clear guidance on when I can change markup and the process to do so.

## Prioritized Functional Requirements

P1 - DOM Contracts Inventory: List of elements/IDs/attributes (e.g., `#round-message`, `#snackbar-container`, `#battle-state-badge`, stat button selectors) and their intended semantics.

Acceptance Criteria:

- The inventory is included and referenced by tests and CLI helpers.

P1 - Change Policy: Document the deprecation and migration process for markup changes (communication, test updates, feature flags if needed).

Acceptance Criteria:

- A short policy section exists describing required steps before markup removal/rename.

P2 - Accessibility Requirements: Specify ARIA roles and focus behavior for key controls.

Acceptance Criteria:

- Key elements include role/label guidance and keyboard interaction expectations.

## Non-Functional Requirements / Design Considerations

- Markup must favor semantic HTML and ARIA for accessibility.
- Avoid coupling internal state to class names used by tests; prefer data attributes (e.g., `data-test-id`).

## Dependencies and Open Questions

- Cross-reference: `design/battleMarkup.md`, `docs/testing-modes.md` and `playwright/` helpers.
- Open question: canonical prefix for test IDs (recommend `data-testid` or `data-test-id`).
