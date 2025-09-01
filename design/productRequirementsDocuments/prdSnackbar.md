# Snackbar Notifications PRD (Updated)

## Overview

Snackbar notifications provide brief, unobtrusive feedback to users near the bottom of the screen. They are used to confirm actions, display errors, or communicate status updates without interrupting gameplay or navigation.

## Problem Statement

Players and users need immediate, accessible feedback for actions (e.g., saving, errors, status changes) that does not disrupt their flow or require dismissing modal dialogs.  
Before snackbars, feedback was inconsistent:

- Some success messages appeared in small, hard-to-see text.
- Certain errors were logged silently without visible player notification.
- Status updates were sometimes shown in pop-ups that blocked gameplay.

> “I didn’t even realize my deck saved—I only found out when I reloaded the game and it was there.” — Player feedback from beta testing

This inconsistency led to confusion, missed information, and reduced trust in the system.

## Goals

- **G1:** Communicate 100% of user actions and system events requiring feedback promptly following trigger.
- **G2:** Maintain a consistent, visually unobtrusive notification style across all game modes and screens.
- **G3:** Meet accessibility standards for live region announcements and color contrast (WCAG 2.1 AA).
- **G4:** Achieve a high success rate in displaying snackbars during automated UI tests.

## User Stories

- As a player, I want to see a confirmation when I save my team so that I know my changes were successful.
- As a user, I want to be notified if an error occurs (e.g., data fails to load) so that I can take corrective action.
- As a developer, I want a simple API to trigger snackbars from any module so that feedback is consistent and easy to implement.

## Player Interaction Flow

1. **Trigger:** Player performs an action (save, load, update) or the system detects an event (error, offline mode).
2. **System Response:** Snackbar appears within promptly following the trigger.
3. **Update:** If a new snackbar is triggered while one is visible, it replaces the current one and restarts the timer.
4. **Dismissal Policy:** Snackbars auto-dismiss only; no manual close button is provided to reduce interaction overhead.
5. **Accessibility:** Screen readers announce snackbar text immediately via ARIA live region.

## Visual & UX Reference

- **Position:** Bottom center of the viewport, **16px** above safe zone on mobile to avoid OS navigation bars.
- **Size:** Max width = **480px** on desktop, **90% viewport width** on mobile.
- **Padding:** **12px vertical**, **16px horizontal** inside snackbar.
- **Typography:** Body font, **14px**, medium weight, truncates after 2 lines with ellipsis.
- **Animation:** Fade-in: **250ms**, ease-out; Fade-out: **250ms**, ease-in.
- **Tap/Click Targets:** Entire snackbar area is interactable for potential future use cases (e.g., retry action).
- **Color & Contrast:** Themed background colors with ≥4.5:1 contrast ratio against text; fallback colors if contrast check fails.

## Prioritized Functional Requirements

| Priority | Feature                       | Description                                                                         |
| -------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| P1       | Show Snackbar                 | Display a temporary message at the bottom of the screen with fade-in/out animation. |
| P1       | Update Snackbar               | Change the current snackbar's text and restart its timers if already shown.         |
| P1       | Accessibility Compliance      | Snackbar uses ARIA live region and `role="status"` for screen readers.              |
| P1       | Configurable Duration         | Snackbar auto-dismisses after a default **3s** and supports **1–10s** range.        |
| P2       | Prevent Overlapping Snackbars | Only one snackbar is visible at a time; new messages replace the old.               |
| P2       | Theming and Contrast          | Snackbar colors adapt to theme and pass contrast checks (≥4.5:1 ratio).             |
| P2       | Localization Support          | Snackbar text supports multi-language strings and right-to-left layouts.            |

## Acceptance Criteria (Given/When/Then)

1. **Given** the player triggers an action that requires confirmation, **when** the action completes, **then** a snackbar appears promptly and fades out after the configured duration (default **3s**).
2. **Given** a snackbar is already visible, **when** a new snackbar is triggered, **then** the current snackbar is replaced and the timer restarts.
3. **Given** the snackbar is displayed, **when** viewed by a screen reader, **then** it is announced using ARIA live region with role="status".
4. **Given** the snackbar text is displayed, **then** it passes WCAG 2.1 AA contrast checks in all supported themes.
5. **Given** the app is in a right-to-left language mode, **then** snackbar text and layout adjust accordingly.
6. **Given** the snackbar is triggered by an error, **then** the error message is displayed in the snackbar.
7. **Given** a custom duration is specified, **when** that duration elapses, **then** the snackbar auto-dismisses.

## Edge Cases / Failure States

- **Offline Mode:** If network errors occur, display an offline snackbar with retry instructions.
- **Empty or Malformed Message:** Default to a generic “Action completed” or “An error occurred” message.
- **Animation Failure:** If animation API is unavailable, show snackbar instantly without fade-in/out.
- **Theme Conflict:** If current theme fails contrast check, override with fallback color scheme.
- **Localization Missing Key:** Fallback to English text with a “[MISSING TRANSLATION]” prefix.

## Non-Functional Requirements / Design Considerations

- Snackbar does not overlap critical UI elements or block navigation.
- Responsive layout: snackbar is centered and adapts to viewport size.
- No persistent timers or memory leaks; timers are cleared on update/removal.
- On mobile, snackbar appears above system navigation bars; on desktop, snackbar is anchored to viewport bottom.

## Dependencies and Open Questions

- Depends on `src/helpers/showSnackbar.js` for API and logic.
- Depends on `src/styles/snackbar.css` for styling and animation.

## Usage Guidance

- Use snackbars for brief, non-blocking feedback only. For critical errors or actions requiring user input, use modal dialogs.
- Always provide clear, concise messages (max 1–2 lines).
- Trigger snackbars via `showSnackbar(message)` for new notifications, or `updateSnackbar(message)` to change the current message.
- Do not use snackbars for persistent or complex information.

## Tasks

- [x] 1.0 Implement Snackbar Component
  - [x] 1.1 Create HTML container for snackbar at bottom center of viewport
  - [x] 1.2 Add ARIA live region and `role="status"` attributes
  - [x] 1.3 Apply responsive CSS for desktop and mobile layouts
- [x] 2.0 Implement Snackbar Animation
  - [x] 2.1 Define fade-in and fade-out animations in CSS with duration and easing
  - [ ] 2.2 Ensure animation fallback for browsers without animation API
  - [x] 2.3 Test for non-overlapping UI and safe zone positioning
- [ ] 3.0 Implement Snackbar API
  - [ ] 3.1 Create `showSnackbar(message)` function
  - [ ] 3.2 Create `updateSnackbar(message)` function
  - [ ] 3.3 Ensure only one snackbar is visible at a time
  - [ ] 3.4 Clear timers and listeners when snackbar is removed
  - [ ] 3.5 Expose optional `duration` parameter in `showSnackbar()`
- [ ] 4.0 Accessibility & Localization
  - [ ] 4.1 Ensure ARIA attributes work with screen readers
  - [ ] 4.2 Test WCAG 2.1 AA contrast compliance
  - [ ] 4.3 Implement localization and right-to-left text support
  - [ ] 4.4 Add fallback text for missing localization keys
- [ ] 5.0 Configurable Settings
  - [ ] 5.1 Add constant for default duration (e.g., 3s)
  - [ ] 5.2 Allow configuration of duration between 1–10 seconds
  - [ ] 5.3 Ensure duration changes do not break animations
- [ ] 6.0 Testing & Edge Cases
  - [ ] 6.1 Test offline mode snackbar with retry instructions
  - [ ] 6.2 Test empty/malformed message fallback
- [ ] 6.3 Test theme conflict fallback colors
- [ ] 6.4 Test multiple snackbar triggers in rapid succession
- [ ] 6.5 Test variable snackbar durations
