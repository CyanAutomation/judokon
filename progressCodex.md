# QA Report & Improvement Plan: `src/pages/battleCLI.html`

This document records the verification of the QA observations for `src/pages/battleCLI.html` and refines the follow-up actions.

## Verification Summary

- ✅ **Confirmed**: Issue #4 — The CLI header renders duplicate scoreboard elements after initialisation.
- ⚠️ **Clarify**: Issue #6 — The timer already exposes `aria-live="polite"`, but a broader a11y audit remains worthwhile.
- ❌ **Not reproduced / outdated**: Issues #1, #2, #3/#7, and #8.

## Detailed Findings

### Issue #4 – Duplicate & Misaligned Scoreboard (**valid**)

- The CLI header keeps the legacy scoreboard (`#cli-round`, `#cli-score`) alongside the shared scoreboard nodes that are unhidden during `init()` (`src/pages/battleCLI/init.js:2339`).
- Because both sets stay visible inside the flex header defined in the page markup (`src/pages/battleCLI.html:509`), users see “Round 0…” / “You: 0…” twice and layout alignment varies by viewport.
- **Action**: Work on adapting the CLI template and styles to use the new scoreboard component while preserving the old CLI look through CSS. This involves          
restructuring the header markup, updating CSS classes like .cli-scoreboard, and ensuring ARIA and dataset attributes remain accessible. Also need to handle 
scoreboard messages, timers, and events to fit CLI style without changing the shared scoreboard logic, likely by CSS overrides. Finally, check and update
tests that refer to removed CLI-specific elements.

### Issue #1 – Battle fails to start (**not reproduced**)

- Selecting a match length through the modal calls `handleRoundSelect`, which persists the value, closes and destroys the modal, and dispatches `startClicked` to the orchestrator (`src/helpers/classicBattle/roundSelectModal.js:259`).
- If the modal cannot load, the CLI falls back to a dedicated “Start match” button that also emits `startClicked` (`src/pages/battleCLI/init.js:537`), and tests cover the fallback (`tests/pages/battleCLI.pointsToWin.startOnce.test.js:6`).
- **Conclusion**: The reported blocker is not reproducible in the current codebase.

### Issues #3 / #7 – Seed input triggers “Invalid key” warnings (**not reproduced**)

- The global key handler ignores events that originate from form controls (`src/pages/battleCLI/events.js:57`), so typing in the seed input cannot surface the warning banner.
- **Conclusion**: Behaviour matches expectations; no change needed.

### Issue #2 – Modal artefacts persist after close (**not reproduced**)

- `handleRoundSelect` explicitly calls `modal.close()`, fires a `close` event, invokes tooltip/keyboard clean-up callbacks, and finally removes the modal backdrop via `modal.destroy()` (`src/helpers/classicBattle/roundSelectModal.js:259`).
- The component implementation of `Modal.destroy()` detaches the element from the DOM (`src/components/Modal.js:120`).
- **Conclusion**: The described overlap cannot be reproduced with the current lifecycle.

### Issue #8 – Verbose mode is missing (**not reproduced**)

- The verbose checkbox is wired through `setupFlags()`, which syncs the checkbox state, toggles section visibility, and streams battle events into the log when enabled (`src/pages/battleCLI/init.js:2088`).
- **Conclusion**: Verbose logging already works; no engineering effort required beyond potential UX refinements.

### Issue #6 – Countdown `aria-live` assertion (**clarify**)

- The countdown element ships with `role="status"` and `aria-live="polite"` (`src/pages/battleCLI.html:533`), so the specific concern is outdated.
- Nevertheless, a holistic review of live regions is advisable while addressing the scoreboard changes.

## Updated Improvement Opportunities

1. **Resolve scoreboard duplication (High Feasibility)**  
   Hide or repurpose the legacy CLI scoreboard once the shared scoreboard initialises (`src/pages/battleCLI/init.js:2339`). Update related tests such as `tests/pages/battleCLI.dualWrite.test.js` to reflect the chosen primary UI.
2. **Audit dynamic announcements (Medium Feasibility)**  
   Reconfirm `aria-live` / `aria-atomic` settings for score, round, and snackbar updates after the scoreboard changes to avoid double announcements.
3. **Align stat list semantics (Medium Feasibility)**  
   Update `buildStatRows` to emit `role="option"` rows under the `role="listbox"` container and ensure the active descendant logic still applies (`src/pages/battleCLI/init.js:1313`).
4. **Modularise inline styles (Medium Feasibility)**  
   Move the large `<style>` block into a dedicated stylesheet to improve maintainability and caching (`src/pages/battleCLI.html:16`).
5. **Stabilise test hooks (Low Feasibility)**  
   Expand the existing `data-testid` coverage for key CLI controls (e.g., stats grid, verbose toggle) to support future Playwright coverage without depending on structural selectors.

## Reference Files

- `src/pages/battleCLI.html`
- `src/pages/battleCLI/init.js`
- `src/helpers/classicBattle/roundSelectModal.js`
- `src/pages/battleCLI/events.js`
- `src/components/Modal.js`
- `tests/pages/battleCLI.pointsToWin.startOnce.test.js`
- `tests/pages/battleCLI.dualWrite.test.js`
