# PRD: Layout Debug Panel

## TL;DR
This PRD describes the Layout Debug Panel, an internal developer tool for visually outlining all visible elements on the page. It is toggled via the Settings page and is only accessible in development mode or for authorized roles. The feature accelerates UI debugging and accessibility checks, and is not exposed to regular players.

## Overview

The Layout Debug Panel is a developer-facing feature that visually outlines all visible elements on the page. It is toggled via a switch in the Settings page and is intended to assist with UI layout debugging and accessibility checks during development.

## Problem Statement

Developers and designers frequently face challenges when diagnosing layout misalignments or inconsistent component sizing in the UI. For example, a designer may notice that a card's padding looks off but has no way to inspect it visually without diving into browser dev tools. Without a quick in-app visual inspection tool, debugging layout issues becomes time-consuming and error-prone, leading to longer QA cycles and the risk of overlooking subtle bugs. This feature addresses that friction and accelerates feedback loops.

## Goals

- Enable developers to toggle a layout debug mode from the Settings page.
- Render visual outlines on 100% of visible elements (or matching custom selectors) quickly.
- Ensure the feature is accessible only in development mode or for authorized roles.
- Confirm that outlines are non-disruptive and visually distinct on all standard UI backgrounds.
- Ensure zero performance degradation or UI alteration when the debug panel is disabled.

## User Stories

- As a developer, I want to toggle a layout debug mode so I can quickly see outlines on all visible elements for UI debugging.
- As a designer, I want to verify alignment and sizing of containers and components without using browser dev tools.
- As a QA engineer, I want to check accessibility and layout consistency during test runs.

## Prioritized Functional Requirements

| Priority | Feature                    | Description                                                                                                                   |
| -------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| P1       | Toggle Layout Debug Panel  | Add a switch in the Settings page to enable/disable the layout debug panel. Only accessible to dev users.                     |
| P1       | Visual Outlines            | When enabled, apply a 1px dashed outline to all visible elements via default selector `body *`.                               |
| P2       | Custom Selector Support    | Allow developers to input custom CSS selectors for outlining specific elements. Invalid selectors are ignored with a warning. |
| P3       | Remove Outlines on Disable | All outlines must be removed and cleaned from DOM styles when disabled.                                                       |

## Defined Player Actions & Game Flow

- The user opens the Settings page.
- Scrolls to the Developer Tools section.
- Toggles the "Layout Debug Panel" switch.
- If ON: outlines appear immediately on all visible elements or those matching a custom selector.
- If OFF: all outlines are removed cleanly from the DOM.
- Input for custom selectors is shown only when the toggle is ON.
- Invalid selectors trigger a non-blocking warning.
- No UI flickering occurs during toggling.

## Acceptance Criteria

- Toggling the switch in Settings immediately adds or removes outlines on all visible elements.
- Outlines are only visible when the debug panel is enabled and for authorized users.
- No outlines remain after disabling the panel.
- The feature does not affect normal gameplay or user experience when off.
- If custom selectors are provided, only those elements are outlined; invalid selectors are ignored with a warning.
- Selector input validates for correct syntax and ignores invalid selectors without crashing.
- The debug panel UI and outlines do not persist across user sessions.
- No performance degradation or UI alteration when the debug panel is disabled.

## Player Settings

- The toggle appears in the Developer Tools section of the Settings page.
- Default state: OFF.
- Visible only to users in development mode or with the dev role.

## Visuals or UX Reference

- Outline color: Red `#FF0000` dashed 1px borders (colorblind-visible).
- Do not interfere with UI interactivity or pointer events.
- Avoid flashing or flickering when toggling.
- Support dark/light themes: outlines should contrast against all backgrounds.
- Suggested click target size for toggle and input: minimum 40px.

## Non-Functional Requirements

- No performance degradation when toggling the panel on/off.
- Outlines must be clearly visible (1px dashed red) and must not overlap with in-game or UI elements.
- The debug panel UI and outlines must not persist across user sessions.
- Feature only visible to users with dev role or in dev environment.

## Edge Cases / Failure States

- If a custom selector is invalid, show a warning and apply no outlines.
- If no elements match a valid custom selector, display a message: "No matching elements found."
- If the DOM is still loading, the feature must delay applying outlines until after `DOMContentLoaded`.
- If toggled on and off rapidly, only the latest toggle action is respected.

## Dependencies and Open Questions

- Relies on the Settings page and `layoutDebugPanel.js` helper.
- Should this feature be restricted in production builds? Recommendation: yes.
- Should keyboard shortcuts be supported for toggling? Recommendation: defer to UX evaluation.

---

## Tasks

- [ ] 1.0 Add Toggle to Settings Page

  - [ ] 1.1 Create "Layout Debug Panel" toggle in Developer Tools section
  - [ ] 1.2 Ensure toggle is visible only to dev users or in dev environment
  - [ ] 1.3 Set default toggle state to OFF on page load

- [ ] 2.0 Implement Outline Rendering Logic

  - [ ] 2.1 Select all visible elements via default selector `body *`
  - [ ] 2.2 Apply 1px dashed red border outline to each
  - [ ] 2.3 Delay render until after `DOMContentLoaded` if necessary

- [ ] 3.0 Add Custom Selector Input Handling

  - [ ] 3.1 Render input for custom CSS selector when debug panel is active
  - [ ] 3.2 Validate selector syntax on input change
  - [ ] 3.3 Display warning if selector is invalid
  - [ ] 3.4 Display message if valid selector matches no elements

- [ ] 4.0 Clean Up on Disable

  - [ ] 4.1 Remove all outlines and injected styles
  - [ ] 4.2 Ensure no side-effects or memory leaks remain
  - [ ] 4.3 Prevent flicker during rapid toggle on/off

- [ ] 5.0 Test Edge Cases and UX Constraints
  - [ ] 5.1 Test toggle behavior when DOM is still loading
  - [ ] 5.2 Test malformed and empty selectors
  - [ ] 5.3 Test on dark/light backgrounds
  - [ ] 5.4 Confirm no UI pointer interactivity is blocked
