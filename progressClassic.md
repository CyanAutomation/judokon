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
