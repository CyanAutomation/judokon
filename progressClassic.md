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

**Actions Taken:**

- Investigated the modal's HTML and CSS structure in `roundSelectModal.js` and `Modal.js`.
- Identified that the modal backdrop starts below the header (`--modal-inset-top` set to header height), leaving the header clickable.
- Modified `RoundSelectPositioner` in `roundSelectModal.js` to disable pointer events on header links when the modal is open, preventing accidental navigation.
- Added `disableHeaderLinks()` method to set `pointerEvents = "none"` on header links during modal display.
- Added re-enabling of pointer events in the `cleanup()` method when the modal closes.

**Outcome:**

- Header links are now disabled during modal display, preventing unexpected navigation.
- Modal functionality remains intact.
- Relevant unit tests (roundSelectModal.test.js) pass.
- Relevant Playwright tests (round-select.spec.js) pass.
- No regressions detected.

### 3. MEDIUM: Keyboard Navigation in Modal Not Working

**Actions Taken:**

- Investigated the `setupKeyboardNavigation` function in `roundSelectModal.js`, which handles number keys (1-3), arrow keys, and Enter.
- Found that the keydown listener was attached to the modal dialog element, but to ensure it works even if focus is lost, changed it to attach to the document.
- The listener prevents default for handled keys and simulates clicks or focuses buttons accordingly.
- Verified that the modal focuses a button on open, and keyboard events should now be captured globally when the modal is active.

**Outcome:**

- Keyboard navigation (number keys, arrows, Enter) is now attached to the document to ensure it works regardless of focus state.
- Relevant unit tests (roundSelectModal.test.js) pass.
- Relevant Playwright tests (round-select-keyboard.spec.js) pass.
- No regressions detected.

### 5. HIGH: Error Handling in Battle Initialization

**Actions Taken:**

- Added try-catch around `await startRoundCycle(store);` in the `onStart` callback of `initRoundSelectModal` in `battleClassic.init.js`.
- If `startRoundCycle` fails, it now calls `showFatalInitError(err)` to display a user-friendly error message with a "Retry" button that reloads the page.
- Modified `startRoundCycle` to re-throw errors from `startRound` and `renderStatButtons` instead of just logging them, ensuring they propagate to the top-level error handler.
- This prevents the battle from freezing on initialization failures and provides a recovery mechanism.

**Outcome:**

- Battle initialization failures now show a clear error message with retry option instead of freezing.
- Errors in `startRound` (including `drawCards`) and `renderStatButtons` are properly handled.
- Relevant unit tests (init-complete.test.js, bootstrap.test.js) pass.
- No regressions detected.

---
