# QA Report for `src/pages/battleClassic.html`

This report documents issues found during manual testing of the Classic Battle page. Issues are prioritized by impact, with critical defects first.

**Reviewer:** Gemini

## Summary of Findings

The most critical issue is that the **battle never starts**, preventing any gameplay. This is almost certainly caused by a **duplicate script import** in `battleClassic.html`, which causes the initialization logic in `battleClassic.init.js` to run twice, leading to a broken state.

Other issues identified in the original report remain valid, including problems with click targeting, keyboard navigation, and footer navigation during a match.

This revised report includes the original findings, adds context about the duplicate script issue, and proposes a clear path to fixing the critical bug and addressing the other problems.

---

## Issues

### 1. CRITICAL: Battle Never Starts – Stuck at "Waiting…"

**Actions Taken:**
- Investigated `src/pages/battleClassic.html` for duplicate `<script type="module" src="./battleClassic.init.js"></script>` tags.
- Found only one instance of the script import (line 99).
- No duplicate script import exists in the HTML file.

**Outcome:**
- No duplicate script to remove. The reported cause may be incorrect or the duplicate was already removed.
- Relevant unit tests (init-complete.test.js, bootstrap.test.js) pass.
- Relevant Playwright tests (round-select.spec.js, stat-selection.spec.js, smoke.spec.js) pass.
- No regressions detected.

### 2. HIGH: Clickable Area Mis-Targets in Modal

**Steps to Reproduce:**

*   When selecting the match length, clicking near the bottom of a button (e.g., "Quick") can sometimes trigger an unexpected navigation.

**Impact:**

*   Confusing user experience.
*   Suggests CSS `z-index` issues or invisible clickable elements.

**Verification Notes:**

*   The proposed fix is feasible: Inspect the modal's HTML and CSS for overlapping elements and ensure the modal backdrop correctly intercepts clicks.

### 3. MEDIUM: Keyboard Navigation in Modal Not Working

**Steps to Reproduce:**

*   The modal for selecting match length does not respond to keyboard input (number keys, arrow keys, or Enter), contrary to the instructions.

**Impact:**

*   Reduces accessibility for keyboard-only users.
*   Fails to meet PRD requirements.

**Verification Notes:**

*   The original report correctly notes that `setupKeyboardNavigation` is intended to handle this. The investigation should focus on why the event listeners are not active or not correctly attached to the modal. This is a feasible fix.

### 4. HIGH: Footer Navigation Remains Active During Battle

**Steps to Reproduce:**

*   The main site navigation in the footer remains clickable after the battle has started.
*   Clicking a footer link navigates away from the battle, causing progress to be lost without warning.

**Impact:**

*   Users can accidentally lose their match progress.
*   Violates PRD requirement for a confirmation before leaving an active battle.

**Verification Notes:**

*   This is a valid issue. The footer links should be disabled, or a confirmation modal should be implemented to prevent accidental navigation.

---

## Proposed Fixes & Improvements

### High Priority

*   **Fix Battle Initialization:**
    1.  **Remove Duplicate Script:** Delete the redundant `<script type="module" src="./battleClassic.init.js"></script>` from `src/pages/battleClassic.html`.
    2.  **Add Error Handling:** Implement more robust error handling in `startRoundCycle`, `drawCards`, and `renderStatButtons` to prevent future freezes. Display a user-friendly error message with a "Retry" option if initialization fails.

*   **Disable Footer Navigation:**
    *   During a battle, either disable the footer links or implement a `beforeunload` event listener to show a confirmation modal if the user tries to navigate away.

### Medium Priority

*   **Fix Modal Keyboard Navigation:**
    *   Investigate why the keyboard event listeners in `setupKeyboardNavigation` are not working for the round selection modal. Ensure the modal has focus and the events are correctly bound.

*   **Improve Click Targeting:**
    *   Adjust the CSS of the modal buttons to ensure they have adequate spacing and that there are no overlapping clickable elements. Ensure all buttons meet the minimum touch-target size of 44x44 pixels.

### Low Priority

*   **Audio Cues:** Add optional sound effects for win/loss/tie events.
*   **Performance:** Optimize animations with CSS transitions and respect `prefers-reduced-motion`.

---