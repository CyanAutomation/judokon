# Round Selection PRD

## TL;DR

Round selection is the UX that allows players to choose the match length (win target) before Classic Battle begins. This PRD defines the UX flow, persistence, accessibility, and integration with autostart/testing modes.

## Problem Statement / Why it matters

Round selection is the first user interaction in a match flow and affects match pacing and testing. If the selection flow is inconsistent or inaccessible, players may be confused or automated tests may fail.

## Goals / Success Metrics

- Provide an accessible modal that lets users choose points-to-win (e.g., 5/10/15).
- Persist the last choice for returning players.
- Support `?autostart=1` for automated flows and testing.

## User Stories

- As a returning player, I want the previously chosen win target restored so I can quickly start a match.
- As an automated test, I want an `autostart` query param to bypass the modal.

## Prioritized Functional Requirements

P1 - Round Selection Modal: Modal appears at match start unless autostart or saved preference exists. Options: 5, 10, 15 points.

Acceptance Criteria:

- Modal displays when no saved preference and `?autostart` is not set.
- Selecting an option stores preference in localStorage and starts the match.

P1 - Autostart Behavior: `?autostart=1` bypasses modal and starts a default-length match.

Acceptance Criteria:

- Visiting `battleJudoka.html?autostart=1` begins a match without showing the modal.

P2 - Persistence: Save and restore last selected points-to-win from localStorage (key: `battle.pointsToWin`).

Acceptance Criteria:

- The saved preference is restored on subsequent page loads.

P2 - Accessibility: Modal must be keyboard navigable, labeled, and dismissible via keyboard with clear focus management.

Acceptance Criteria:

- Modal meets basic accessibility checks (focus trap, ARIA labels, keyboard operation documented).

## Non-Functional Requirements / Design Considerations

- Telemetry: Log selected win target for analytics.
- Testing: Provide Playwright helpers to wait for modal readiness or autostart.

## Dependencies and Open Questions

- Cross-reference: `docs/round-selection.md`, `prdBattleClassic.md`, and `prdTestMode.md`.
- Open question: Should the list of options be configurable via settings? Recommendation: keep static for now and raise as P3.
