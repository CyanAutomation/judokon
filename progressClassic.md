QA r# QA Report for `src/pages/battleClassic.html`

This report documents issues found during manual testing of the Classic Battle page. Issues are prioritized by impact, with critical defects first.

## Issues

### 1. Battle Never Starts – Stuck at "Waiting…"

**Steps to Reproduce:**

1. Navigate to `battleClassic.html`.
2. Select any match length (Quick, Medium, or Long). The modal closes, and a blue label indicates the chosen win target.
3. Observe the scoreboard: it displays "Waiting… Round 0" and shows "You: 0 Opponent: 0". No cards appear in the battle area, and the **Next** button remains disabled; the game never progresses beyond this state.

**Impact:**

- Critical defect preventing the core gameplay loop (draw card → select stat → resolve round).
- Blocks verification of stat selection, scoring, AI difficulty, timers, and end-game conditions.
- Likely caused by a JavaScript error, missing resource, or initialization failure.

**Verification Notes:**

- Code review shows `startRoundCycle` should be called after modal selection, drawing cards and rendering stat buttons.
- Possible failure points: errors in `drawCards`, missing judoka data, or rendering failures in `JudokaCard.render()`.
- Recommend adding console logging in `startRoundCycle` and `drawCards` to identify where it fails. Check browser console for uncaught errors.

### 2. Clickable Area Mis-Targets

**Steps to Reproduce:**

- When selecting the match length in the modal, clicking near the bottom of the Quick button sometimes navigates to an unrelated page (e.g., opens `judoka.json` via raw.githubusercontent.com).
- This occurred when a click at y≈530 mis-fired and loaded a different page.

**Impact:**

- Unexpected navigation confuses users and suggests overlapping UI elements or invisible links capturing clicks.
- Complicates mouse targeting, especially for children.

**Verification Notes:**

- Inspect modal HTML and CSS for z-index issues, pointer-events, or overlapping elements.
- Ensure modal backdrop properly intercepts clicks.

### 3. Keyboard Selection Does Not Work

**Steps to Reproduce:**

- The modal instructions state that number keys (1–3) or arrow keys can select an option.
- Pressing "1" or arrow keys has no effect; only mouse clicks dismiss the modal.

**Impact:**

- Reduces accessibility for users who cannot use a mouse.
- Violates PRD requirements for keyboard navigation.

**Verification Notes:**

- Code review confirms keyboard handlers are implemented in `setupKeyboardNavigation` (numbers 1-3, arrows, Enter).
- Modal focuses the first button on open, so handlers should work.
- Possible issues: event not attached, modal not focused, or default prevention failing.
- Test in browser; check if focus is on modal.

### 4. Missing Stat Buttons and Card Visuals

**Steps to Reproduce:**

- After closing the modal, neither player's nor opponent's cards render.
- The `#stat-buttons` container remains empty, and `data-buttons-ready` never sets to `true`.

**Impact:**

- Players cannot select stats without visible buttons.
- Screen readers cannot describe stats, hindering accessibility testing.

**Verification Notes:**

- `renderStatButtons` is called in `startRoundCycle`, which creates buttons and sets `data-buttons-ready`.
- Cards are rendered in `drawCards` via `generateRandomCard` and `renderOpponentPlaceholder`.
- Check for errors in `JudokaCard.render()` or missing data.

### 5. Scoreboard Timer Never Displays

**Steps to Reproduce:**

- The `#next-round-timer` region remains blank.
- Scoreboard header stays "Waiting…".
- 30s stat selection timer and countdown/cooldown flows are not shown.

**Impact:**

- Cannot verify auto-select on timeout, timer pausing, or drift detection.

**Verification Notes:**

- `beginSelectionTimer` is called in `startRoundCycle`.
- Timer updates `#next-round-timer` with "Time Left: Xs".
- If battle doesn't start, timer isn't reached.

### 6. No Opponent Action Feedback

**Steps to Reproduce:**

- Since rounds never start, no "Opponent is choosing…" message or reveal delay appears.

**Impact:**

- Cannot validate opponent behavior or AI difficulty.

**Verification Notes:**

- Feedback is shown via `showSelectionPrompt` and event handlers.
- Depends on battle starting.

### 7. Quit Flow Unreachable

**Steps to Reproduce:**

- "Quit" button is displayed, but since match doesn't begin, no confirmation modal or return logic triggers.

**Impact:**

- Cannot confirm PRD-required quit confirmation.

**Verification Notes:**

- Quit handler is wired in `battleClassic.init.js`.
- Depends on battle starting.

### 8. Footer Navigation Accessible but Breakable

**Steps to Reproduce:**

- Bottom navigation bar remains active during match.
- Clicking it navigates away without confirmation, despite PRD requiring confirmation.

**Impact:**

- Users can accidentally lose progress.

**Verification Notes:**

- Footer is not disabled; no interceptors.
- Add confirmation or disable during battles.

## Improvement Opportunities

### High Priority

- **Fix Battle Initialization Bug:** Add comprehensive error handling in `startRoundCycle`, `drawCards`, and `renderStatButtons`. Surface errors via snackbar with retry option. Log initialization steps to console for debugging.
- **Add Card Rendering Verification:** Ensure `JudokaCard.render()` succeeds; add fallbacks for missing images or data. Verify `player-card` and `opponent-card` elements exist.
- **Implement Error Recovery:** Add user-facing error screens for data load failures or initialization errors. Include "Retry" button to reload without full refresh.
- **Disable Footer Navigation During Battles:** Hide or disable bottom nav bar once match starts, or add confirmation modal on navigation attempts.

### Medium Priority

- **Ensure Keyboard Support:** Verify and fix modal keyboard navigation. Ensure modal is focused and events are attached. Test with screen readers.
- **Improve Click Targeting:** Increase button spacing and ensure modal backdrop captures all clicks. Meet PRD touch target size (≥44px).
- **Add Accessible Descriptions:** Include `aria-describedby` on stat buttons explaining stat meanings. Ensure screen reader announcements for selections.
- **Visual Feedback for Stat Selection:** Highlight selected buttons and announce choices via scoreboard and ARIA live regions.
- **Expose Test Hooks:** Document query parameters or overrides for `enableTestMode` and deterministic outcomes.

### Low Priority

- **Audio Cues:** Add optional sound effects for wins/losses/ties with mute toggle.
- **Performance Optimization:** Use CSS transitions for animations, compress assets, respect `prefers-reduced-motion`.
- **Robust Timer Handling:** Detect and handle timer drift (>2s) with user notifications.

### Additional Suggestions

- **Console Error Monitoring:** Check browser console for uncaught errors during initialization.
- **Data Validation:** Ensure `judoka.json` and `gokyo.json` load correctly; add checksums or validation.
- **State Debugging:** Add debug panel or query params to expose internal state for QA.
- **Cross-Browser Testing:** Verify behavior in different browsers, especially mobile.
- **Integration with CI:** Add automated checks for modal dismissal, button rendering, and timer start.port for src/pages/battleClassic.html

| Issue                                          | Steps to reproduce                                                                                                                                                                                                                                                                                                                                                                      | Impact                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Battle never starts – stuck at “Waiting…”**  | 1. Navigate to `battleClassic.html`.<br>2. Select any match length (Quick, Medium or Long).  The modal closes and a blue label indicates the chosen win target.<br>3. Observe the scoreboard: it displays “Waiting… Round 0” and shows “You: 0 Opponent: 0”.  No cards appear in the battle area and the **Next** button remains disabled; the game never progresses beyond this state. | This is a critical defect.  The core loop (draw card → select stat → resolve round) cannot be exercised.  It prevents verification of nearly all functional requirements (stat selection, scoring, AI difficulty, timers, end‑game conditions).  It likely stems from a JavaScript error or missing resource (the engine appears not to initialise). |
| **Clickable area mis‑targets**                 | When selecting the match length modal, clicking near the bottom of the Quick button sometimes navigates to an unrelated page (e.g., opens `judoka.json` via raw\.githubusercontent.com).  This happened on an earlier attempt when a click at y≈530 mis‑fired and loaded a different page.                                                                                              | Unexpected navigation confuses players and suggests that UI elements may overlap or that there are invisible links capturing clicks.  It also complicates keyboard/mouse targeting for children.                                                                                                                                                     |
| **Keyboard selection does not work**           | The modal instructions state that number keys (1–3) or arrow keys can select an option.  Pressing “1” or pressing arrow keys had no effect—only a mouse click dismissed the modal.                                                                                                                                                                                                      | Inconsistent keyboard support reduces accessibility, especially for players who cannot use a mouse.  The PRD lists keyboard navigation as an accessibility requirement.                                                                                                                                                                              |
| **Missing stat buttons and card visuals**      | After closing the modal, neither the player’s nor opponent’s cards render.  The `#stat-buttons` container remains empty and the `data-buttons-ready` attribute never switches to `true`.                                                                                                                                                                                                | Without visible cards or stat buttons, players cannot choose stats.  This also prevents screen readers from describing stats, so the accessibility of the stat selection cannot be judged.                                                                                                                                                           |
| **Scoreboard timer never displays**            | The `#next-round-timer` region remains blank while the scoreboard header always says “Waiting…”.  The 30 s stat selection timer is never shown, and the countdown/cool‑down flows cannot be evaluated.                                                                                                                                                                                  | Cannot verify auto‑select on timeout, timer pausing on tab change or drift detection.                                                                                                                                                                                                                                                                |
| **No opponent action feedback**                | Since rounds never start, there is never an “Opponent is choosing…” message or reveal delay.                                                                                                                                                                                                                                                                                            | Opponent behaviour and AI difficulty settings cannot be validated.                                                                                                                                                                                                                                                                                   |
| **Quit flow unreachable**                      | The “Quit” button is displayed but since a match never actually begins, there is no confirmation modal nor return to home screen logic to test.                                                                                                                                                                                                                                         | The PRD requires a quit confirmation with no penalty, but this cannot be confirmed.                                                                                                                                                                                                                                                                  |
| **Footer navigation accessible but breakable** | The bottom navigation bar is fully active during the match.  Clicking it mid‑match navigates away from the battle without any confirmation, even though the PRD indicates a confirmation step.                                                                                                                                                                                          | Players can accidentally leave a match without confirmation, causing progress loss.  The nav bar should be disabled or intercepted during battles.                                                                                                                                                                                                   |

Improvement opportunities
Fix the battle initialisation bug. The most pressing issue is that the battle engine doesn’t start. Investigate whether the client fails to load battleClassic.init.js, the judoka dataset, or dependencies. Add error handling around asynchronous imports and surface any fatal errors in the UI (e.g., display a snackbar with a retry button).
Ensure keyboard support for match‑length selection. The modal’s instructions claim number and arrow keys work, but they currently don’t. Hook keyboard events properly and focus the first button when the modal opens.
Improve click‑target spacing. The mis‑navigation suggests invisible clickable elements near the Quick button. Increase spacing and ensure the modal intercepts pointer events. Touch targets should be ≥ 44 px high as per the PRD.
Disable or intercept footer navigation during battles. To prevent accidental exits, hide or disable the bottom nav bar once a match begins, or add a confirmation modal when navigation is attempted.
Add accessible descriptions to stat buttons. The PRD specifies aria-describedby attributes for stat buttons explaining the meaning of each stat. These should be included in the dynamically created buttons to assist screen‑reader users.
Provide visual feedback when selecting stats. When the core loop is operational, ensure that selected buttons highlight and the chosen stat is announced both visually and via the scoreboard. This will help young players understand cause and effect.
Expose test hooks and deterministic mode. The PRD lists enableTestMode and battleStateProgress flags. Document how to enable these via query parameters or global overrides so QA testers can simulate deterministic outcomes and inspect state transitions without randomisation.
Consider audio cues. Although optional, short sound effects for wins, losses and ties (with mute option) would enhance engagement for children.
Optimise for low‑end devices. Use CSS transitions rather than heavy JavaScript for animations, limit the size of card images and compress assets to ensure the game runs smoothly on low‑spec devices. Use prefers-reduced-motion media query to disable animations for users who prefer less motion.
Add robust error recovery. Implement user‑facing error screens for dataset load failures, timer drift (> 2 s), or other unexpected errors. Provide a “Retry” button to reload the match without requiring a full page refresh.
Quit flow – The PRD requires a confirmation modal on quit. The game exposes a Quit button but clicking it (without a running match) simply exits; once the engine bug is fixed, verify that a confirmation appears