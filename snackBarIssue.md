# Bug Report: Snackbar Behavior Issues

## 1. Executive Summary

The snackbar notification system is exhibiting buggy behavior, primarily failing to handle concurrent messages as intended. The current implementation causes messages to overwrite each other instead of stacking, leading to a loss of information for the user. Additionally, there are conflicting specifications for the timing of certain messages, causing inconsistent behavior and test failures.

This document outlines the desired behavior, analyzes the root cause of the current issues, and proposes a clear path for remediation.

## 2. Observed Behavior vs. Desired Behavior

### Desired Behavior

The core design intention for the snackbar system is to handle multiple concurrent notifications gracefully by stacking them.

- **Stacking:** When a new message arrives while another is visible, the new message should appear at the bottom, and the older message should be pushed up.
- **Opacity:** The older, upper message should have reduced opacity to visually distinguish it from the newer one.
- **Limit:** A maximum of two snackbar messages should be displayed at any given time. If a third message arrives, the oldest (top) message is dismissed, the bottom message moves to the top (with reduced opacity), and the new message appears at the bottom.

### Current (Observed) Behavior

- **Message Overwriting:** Only one snackbar message is ever visible. A new call to `showSnackbar` replaces any existing message.
- **Inconsistent Timing:** The "Opponent is choosing..." message has conflicting appearance logic. The QA specification requires it to appear *after* a delay, while unit tests expect it to appear *immediately*.
- **Persistent Messages:** In some test scenarios, the initial "First to X points wins" message persists, blocking subsequent messages from appearing.

## 3. Root Cause Analysis

1.  **Missing Stacking/Queueing Logic:** The primary issue is that the `showSnackbar` helper function is stateless. It acts on a single DOM element and has no awareness of other messages. It lacks a queue or a mechanism to manage multiple message elements.
2.  **Conflicting Specifications:** There is a direct conflict between the documented QA behavior and the implemented unit tests, leading to confusion and recurring test failures.
    - **QA Spec (`docs/qa/opponent-delay-message.md`):** When opponent delay is enabled, NO snackbar should appear initially. The "Opponent is choosing..." message should only show *after* the delay.
    - **Unit Test (`tests/classicBattle/opponent-message-handler.improved.test.js`):** When opponent delay is enabled, the test expects the message to be shown *immediately*.

## 4. Investigation Details from Previous Session

### Changes Made

- **`src/helpers/settingsPage.js`**: Fixed a save status indicator. This is unrelated to the snackbar issue but was part of the previous investigation.
- **`src/helpers/classicBattle/uiEventHandlers.js`**: Logic was modified to try and defer the snackbar message, but this was built on the flawed assumption that `showSnackbar` could handle the complexity.

### Current Test Failures

- **Playwright (Delay Enabled):** The snackbar never appears after the delay.
- **Playwright (Delay Disabled):** The "First to 5 points wins" message persists instead of showing the opponent's choice message.

## 5. Opportunities for Improvement & Recommendations

To fix the current bugs and create a robust system, the following actions are recommended:

1.  **Refactor `showSnackbar.js` to be a "Snackbar Manager":**
    - The helper should be responsible for managing a state (e.g., an array of active messages).
    - It should create and destroy DOM elements for each snackbar as needed.
    - It will apply the appropriate CSS classes for positioning (`.snackbar-top`, `.snackbar-bottom`) and opacity (`.snackbar-stale`) based on the message queue.
    - It should enforce the two-message limit, automatically dismissing the oldest message when a new one arrives.

2.  **Simplify UI Event Handlers:**
    - The logic in `src/helpers/classicBattle/uiEventHandlers.js` should be simplified. Its only responsibility should be to call the "Snackbar Manager" with the message content, not to handle any presentation logic.

3.  **Align on a Single Specification:**
    - The QA specification should be treated as the single source of truth. The unit and Playwright tests must be updated to assert the behavior described in `docs/qa/opponent-delay-message.md`.

4.  **Enhance Test Coverage:**
    - Create new unit tests specifically for the Snackbar Manager to validate the stacking, opacity, and limit enforcement logic.
    - Create a Playwright test that simulates rapid events to confirm that the snackbar stacking behaves correctly in a live environment.
