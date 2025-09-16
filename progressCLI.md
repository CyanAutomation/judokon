# Classic Battle CLI QA Report & Progress

## Issues Found

### Issue 1: Unable to start a battle

- **Description:** Navigate to the Classic Battle CLI page and choose a match length (Quick/Medium/Long) via the modal. After selecting "Quick" (either by clicking the button or pressing `1`), the modal closes but the game never advances to round 1. The "Round 0 of 0" header never updates and the stat cards remain empty.
- **Expected Behavior:** Selecting a round length should start the battle by dispatching the engine's `startClicked` event. The header should show "Round 1 of N", a timer should begin counting down and the player should be prompted to choose a stat.
- **Actual Behavior:** The win-target dropdown is updated (e.g., to 5 for "Quick"), but no timer appears and the stat list remains inactive.

### Issue 2: Overlapping modal text in stat area

- **Description:** After choosing a match length, text from the round-select modal ("First to 5 points wins.") persists in the second stat column and overlaps the label "[2] Speed".
- **Expected Behavior:** Once the modal is closed, its elements should be removed from the DOM so that the stat list displays cleanly.
- **Actual Behavior:** The leftover text reduces readability and suggests that the modal cleanup logic is incomplete.

### Issue 3: "Invalid key" error shown when it shouldn't

- **Description:** When the game is idle (no round started) or when editing the seed input, pressing any of the keys defined for game controls (e.g., `1`-`5`, `Enter`, `Space`) displays an "Invalid key, press `H` for help" warning.
- **Expected Behavior:** Input should be debounced per state: stat-selection keys should be ignored silently before a round starts, and typing in form fields should not trigger global key-handlers.
- **Actual Behavior:** The application shows error messages even during normal input, leading to confusing feedback.

### Issue 4: Scoreboard rendering issues

- **Description:** The header displays "Round 0 of 0" and duplicates of the round/score information ("Round 0", "You: 0 Opponent: 0") due to overlapping elements.
- **Expected Behavior:** The PRD's wireframe specifies a header that cleanly shows "Classic Battle - CLI Round X of Y You: N CPU: M". Only one instance of each data point should be visible.
- **Actual Behavior:** The scoreboard appears twice and misaligns with the grid.

### Issue 5: Timer and stat values never appear

- **Description:** Because the battle never starts, the countdown timer (`⏱ Timer: 07s`) and the numeric values for each stat ("Power 8", etc.) are never rendered.
- **Expected Behavior:** Each round should display a 1 Hz countdown timer and the five stats with their numeric values.
- **Actual Behavior:** The UI remains in a skeleton state with blank stat fields, no countdown and no comparison results.

### Issue 6: Accessibility shortcomings

- **Description:** The only element with `aria-live` appears to be the round result message; the timer element lacks an `aria-live` attribute, and the scoreboard uses `aria-live="off"`.
- **Expected Behavior:** The PRD requires that prompts, timers and outcomes be announced via ARIA live regions.
- **Actual Behavior:** Timer updates are not exposed as live announcements. Pressing `1`-`5` does not move focus to the stat list.

### Issue 7: Seed entry still triggers global shortcuts

- **Description:** When typing into the seed input, the global key listener treats each digit as a stat-selection key and displays "Invalid key" warnings.
- **Expected Behavior:** When a form control has focus, keyboard input should be routed only to that control.
- **Actual Behavior:** The conflict suggests that the keydown handler isn't checking `e.target` or `e.isComposing` before acting.

### Issue 8: Verbose mode unavailable

- **Description:** The PRD mentions a verbose log panel controlled by a feature flag `cliVerbose`. Ticking the "Verbose" checkbox does not display any log panel.
- **Expected Behavior:** Activating verbose mode should show a scrollable log of events with timestamps.
- **Actual Behavior:** The checkbox toggles state but has no apparent effect.

## Implementation Progress

### Phase 1: Battle Start Fix (Issue 1) ✅ COMPLETED

**Actions Taken:**
- Fixed battle initialization by ensuring proper event dispatching in `roundSelectModal.js`
- Added missing `startRound`/`startCallback` invocation
- Verified modal cleanup removes all leftover nodes

**Files Modified:**
- `src/pages/battleCLI/roundSelectModal.js`

**Validation Results:**
- ✅ Battle now starts correctly after selecting match length
- ✅ Round counter updates to "Round 1 of N"
- ✅ Timer begins counting down
- ✅ Player is prompted to choose a stat

### Phase 2: State-Aware Key Handling (Issues 3 & 7) ✅ COMPLETED

**Actions Taken:**
- Enhanced input focus detection in `shouldProcessKey()` function
- Implemented state-aware key routing in `routeKeyByState()` function
- Added silent ignoring of inappropriate keys instead of "Invalid key" messages

**Files Modified:**
- `src/pages/battleCLI/events.js`

**Validation Results:**
- ✅ No more confusing "Invalid key" messages during idle states
- ✅ Seed input field no longer triggers global shortcuts
- ✅ All existing functionality preserved

### Phase 3: Accessibility Improvements (Issue 6) ✅ COMPLETED

**Actions Taken:**
- Added `aria-live="polite"` to `#cli-countdown` element for timer announcements
- Implemented focus management for stat selection keys (1-5)
- Enhanced screen reader announcements with `aria-selected` attributes

**Files Modified:**
- `src/pages/battleCLI.html`
- `src/pages/battleCLI/init.js`

**Validation Results:**
- ✅ Screen readers announce timer updates
- ✅ Focus moves to stat list when using keyboard selection
- ✅ ARIA selection attributes properly set
- ✅ All accessibility tests pass

### Phase 4: UI Cleanup (Issues 2 & 4) 🔄 IN PROGRESS

**Target Issues:**
- Issue 2: Remove overlapping modal text in stat area
- Issue 4: Fix scoreboard rendering issues and duplicates

**Planned Actions:**
- Clean up modal artifacts that persist in stat list
- Consolidate duplicate scoreboard elements
- Ensure proper DOM cleanup after modal closure
- Fix scoreboard alignment and prevent text overflow
