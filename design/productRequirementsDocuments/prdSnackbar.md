# Snackbar Notifications PRD

## Overview
Snackbar notifications provide brief, unobtrusive feedback to users near the bottom of the screen. They are used to confirm actions, display errors, or communicate status updates without interrupting gameplay or navigation.

## Problem Statement
Players and users need immediate, accessible feedback for actions (e.g., saving, errors, status changes) that does not disrupt their flow or require dismissing modal dialogs. Prior to snackbars, feedback was inconsistent or missing, leading to confusion and missed information.

## Goals
- Ensure all user actions and system events requiring feedback are communicated promptly and accessibly.
- Maintain a consistent, visually unobtrusive notification style across all game modes and screens.
- Meet accessibility standards for live region announcements and contrast.

## User Stories
- As a player, I want to see a confirmation when I save my team so that I know my changes were successful.
- As a user, I want to be notified if an error occurs (e.g., data fails to load) so that I can take corrective action.
- As a developer, I want a simple API to trigger snackbars from any module so that feedback is consistent and easy to implement.

## Prioritized Functional Requirements
| Priority | Feature                        | Description                                                                 |
|---------|--------------------------------|-----------------------------------------------------------------------------|
| P1      | Show Snackbar                  | Display a temporary message at the bottom of the screen with fade-in/out.   |
| P1      | Update Snackbar                | Change the current snackbar's text and restart its timers if already shown. |
| P1      | Accessibility Compliance       | Snackbar uses ARIA live region and role attributes for screen readers.      |
| P2      | Prevent Overlapping Snackbars  | Only one snackbar is visible at a time; new messages replace the old.       |
| P2      | Theming and Contrast           | Snackbar colors adapt to theme and pass contrast checks.                    |
| P3      | Configurable Duration          | Allow duration to be adjusted via constants or CSS variables.               |

## Acceptance Criteria
- Only one snackbar is visible at a time; new messages replace the previous one.
- Snackbar appears within 100ms of API call and fades out after the configured duration.
- Snackbar uses `role="status"` and `aria-live="polite"` for accessibility.
- Snackbar text is readable and passes contrast checks in all supported themes.
- If an error occurs (e.g., data load failure), a snackbar displays the error message.
- Developers can trigger snackbars from any module using `showSnackbar(message)` or `updateSnackbar(message)`.
- The snackbar does not block user interaction and disappears automatically.

## Non-Functional Requirements / Design Considerations
- Minimum 30 fps animation performance during fade-in/out.
- Snackbar does not overlap critical UI elements or block navigation.
- Responsive layout: snackbar is centered and adapts to viewport size.
- No persistent timers or memory leaks; timers are cleared on update/removal.

## Dependencies and Open Questions
- Depends on `src/helpers/showSnackbar.js` for API and logic.
- Depends on `src/styles/snackbar.css` for styling and animation.
- Open: Should duration be user-configurable or fixed per design?

## Usage Guidance
- Use snackbars for brief, non-blocking feedback only. For critical errors or actions requiring user input, use modal dialogs.
- Always provide clear, concise messages (max 1–2 lines).
- Trigger snackbars via `showSnackbar(message)` for new notifications, or `updateSnackbar(message)` to change the current message.
- Do not use snackbars for persistent or complex information.

## References
- See `src/helpers/showSnackbar.js` and `src/styles/snackbar.css` for implementation details.
- Follows JU-DO-KON PRD guidelines in `design/codeStandards/prdRulesForAgents.md`.
