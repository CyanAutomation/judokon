# Card Inspector PRD

## Overview (TL;DR)
The Card Inspector is a developer/debugging feature in JU-DO-KON! that allows users to view the raw JSON data of a judoka card directly within the UI. It is toggled via a switch in the Settings page and is intended to aid in development, QA, and advanced user troubleshooting.

## Problem Statement / Why It Matters
Developers and testers need a way to quickly inspect the underlying data for each judoka card to verify correctness, debug issues, and validate data binding. Without an in-app inspector, this process is slow and error-prone, requiring manual DOM inspection or console logging.

## Goals / Success Metrics
- Enable developers and QA to view the JSON data for any rendered judoka card in the UI.
- Make it easy to toggle the inspector on/off via the Settings page.
- Ensure the inspector does not interfere with normal gameplay or card display.

## User Stories
- As a developer, I want to see the JSON data for a card so that I can debug data issues.
- As a QA tester, I want to verify that the card UI matches the underlying data.
- As an advanced user, I want to inspect card data for transparency and troubleshooting.

## Prioritized Functional Requirements
| Priority | Feature                        | Description                                                                 |
|----------|-------------------------------|-----------------------------------------------------------------------------|
| P1       | Inspector Toggle in Settings   | Add a switch in the Settings page to enable/disable the Card Inspector.     |
| P1       | Inspector Panel on Card        | When enabled, display a panel on each card showing its JSON data.           |
| P2       | Inspector Panel Collapsible    | The inspector panel should be collapsible/expandable (e.g., <details>).     |
| P2       | Inspector Panel Styling        | Inspector panel should be visually distinct and not interfere with gameplay.|

## Acceptance Criteria
- When the Card Inspector is enabled in Settings, every judoka card displays a collapsible panel labeled "Card Inspector".
- The panel contains a formatted JSON representation of the card's data.
- The inspector panel is hidden when the feature is disabled in Settings.
- The inspector panel is collapsed by default and can be expanded/collapsed by the user.
- The inspector panel does not overlap or obscure card content when collapsed.
- Toggling the setting takes effect immediately (no page reload required).

## Non-Functional Requirements / Design Considerations
- Inspector panel must be accessible (keyboard and screen reader friendly).
- Inspector panel must not degrade card rendering performance.
- Inspector panel must not be visible in production builds unless explicitly enabled.

## Dependencies and Open Questions
- Depends on card rendering logic in `src/helpers/cardBuilder.js`.
- Inspector toggle is implemented in the Settings page (`settings.html`).
- Open: Should the inspector support additional views (e.g., markup preview) in the future?
