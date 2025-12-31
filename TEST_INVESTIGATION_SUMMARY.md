# Playwright Test Failure Investigation Summary

**Date of Report**: December 31, 2025  
**Investigation Status**: ⚠️ **INCOMPLETE** - Investigation appears abandoned or not finalized  
**Application Version/Commit**: Not specified (requires update)  
**Playwright Version**: @playwright/test v1.56.1 (verified from package.json)  
**Tests Analyzed**: 17 failing tests in `playwright/battle-classic/`  
**Tests Fixed**: 3 (documented)  
**Tests Remaining**: 14 (status unknown)

## ⚠️ Document Status Warning

**Issues with this document:**
1. **Incomplete Investigation**: Only 3 of 17 tests documented as fixed, status of remaining 14 tests unknown
2. **Placeholder Content**: Multiple `[YYYY-MM-DD]` dates and `[Link to file on GitHub]` placeholders not filled in
3. **Missing Context**: No commit hashes, no specific version numbers, no completion date
4. **Unknown Current State**: Are the remaining tests still failing? Fixed? Deprioritized?

**Recommendations:**
- Update with actual dates and commit hashes
- Complete investigation for remaining 14 tests OR mark as "investigation incomplete"
- Add current test suite status (run `npx playwright test` to get current pass/fail rates)
- Consider archiving if investigation is no longer active

## Tests Successfully Fixed

### 1. keyboard-navigation.spec.js - "should select a stat with Enter and update the round message"
- **Issue**: Missing `data-testid="round-message"` attribute on element.
- **Root Cause**: HTML element had `id="round-message"` but no `data-testid` for Playwright.
- **Solution**: Added `data-testid` attribute to `src/pages/battleClassic.html`.
- **Additional Fixes/Notes**: Test was trying to read initial `textContent` which could block; changed to verify element attachment and non-empty state after selection.
- **Result**: ✅ PASS (6.9s)
- **Date Fixed**: [YYYY-MM-DD]
- **Relevant Files/PRs**:
    - `src/pages/battleClassic.html` (e.g., [Link to file on GitHub](https://github.com/user/repo/blob/main/src/pages/battleClassic.html))
    - `playwright/battle-classic/keyboard-navigation.spec.js` (e.g., [Link to file on GitHub](https://github.com/user/repo/blob/main/playwright/battle-classic/keyboard-navigation.spec.js))
    - [Link to relevant PR (if applicable)](https://github.com/user/repo/pull/XYZ)

### 2. opponent-message.spec.js - "shows opponent feedback snackbar immediately after stat selection"
- **Issue**: Test timing out waiting for "cooldown" state specifically.
- **Root Cause**: Battle sometimes transitions directly to "roundOver", skipping "cooldown" due to fast resolution.
- **Solution**: Changed `waitForBattleState` to accept multiple valid post-selection states (cooldown, roundOver, waitingForPlayerAction).
- **Result**: ✅ PASS (8.7s)
- **Date Fixed**: [YYYY-MM-DD]
- **Relevant Files/PRs**:
    - `playwright/battle-classic/opponent-message.spec.js` (e.g., [Link to file on GitHub](https://github.com/user/repo/blob/main/playwright/battle-classic/opponent-message.spec.js))
    - [Link to relevant PR (if applicable)](https://github.com/user/repo/pull/XYZ)

### 3. opponent-message.spec.js - "CLI resolveRound reveals the opponent card"
- **Issue**: Test expected `#opponent-card` to have `aria-label="Mystery opponent card"`.
- **Root Cause**: By design (`opponentPlaceholder.js:114`), container keeps `aria-label="Opponent card"`. The mystery label is on the inner placeholder element.
- **Solution**: Changed test to check for placeholder visibility and `is-obscured` class instead.
- **Result**: ✅ PASS (4.0s)
- **Date Fixed**: [YYYY-MM-DD]
- **Relevant Files/PRs**:
    - `playwright/battle-classic/opponent-message.spec.js` (e.g., [Link to file on GitHub](https://github.com/user/repo/blob/main/playwright/battle-classic/opponent-message.spec.js))
    - [Link to relevant PR (if applicable)](https://github.com/user/repo/pull/XYZ)

## Common Failure Patterns Identified

### Pattern 1: State Transition Issues (Tests 2, 4, 7, 8, 9)
**Symptoms**:
- Tests wait for specific battle states that are skipped.
- Timeouts in `waitForBattleState()`.
- Battle advancing too quickly through intermediate states.
**Examples**:
- Test expects "cooldown" but gets "roundOver" immediately.
- Test expects "waitingForPlayerAction" but state is already past it.
**Possible Causes**:
- Recent changes to state machine timing.
- Race conditions in state transitions.
- Auto-advance features triggering faster than expected.

### Pattern 2: Selection Reset Not Working (Test 4, 8)
**Symptoms**:
- `selectionMade` flag stays `true` when it should reset to `false`.
- Selection state persists across rounds.
**Code Reference**:
- `waitingForPlayerActionEnter` handler SHOULD reset this (line 44 of `stateHandlers/waitingForPlayerActionEnter.js` - e.g., [Link to file on GitHub](https://github.com/user/repo/blob/main/path/to/stateHandlers/waitingForPlayerActionEnter.js#L44)).
- Handler may not be invoked correctly after round advancement.
**Impact**: Prevents proper round-to-round state reset.

### Pattern 3: Stat Buttons Stay Disabled (Tests 5, 6, 17)
**Symptoms**:
- Tests timeout clicking stat buttons that remain disabled.
- Buttons show `disabled` attribute and `disabled` class.
- Often happens after replay or round advancement.
**Possible Causes**:
- Button enable/disable logic not triggered.
- State machine not reaching "waitingForPlayerAction" properly.
- Event handlers not re-enabling buttons.

### Pattern 4: Snackbar Messages Not Updating (Tests 10-15)
**Symptoms**:
- Snackbar shows initial message ("First to X points wins") and never updates.
- Expected messages like "Opponent is choosing", "You Picked:", "Next round in" never appear.
- Suggests event handlers not firing.
**Test 15 Specific**:
- Also had wrong expectation (`data-selected` attribute doesn't exist, should check `selected` class).
- Even after fixing attribute check, snackbar still doesn't update.

## Tests Needing Further Investigation

### Priority 1 - Likely Application Bugs
- **Test #4**: `opponent-reveal.spec.js` "resets stat selection after advancing"
  - `selectionMade` not resetting - core functionality issue.
- **Test #15**: `snackbar-console-diagnostic.spec.js`
  - Snackbar never updates - event handler issue.

### Priority 2 - Timing/State Machine Issues
- **Tests #7, #8, #9**: `round-flow.spec.js` (multiple)
  - State transition expectations vs reality.
- **Tests #10, #11**: `round-flow.spec.js`
  - "Opponent is choosing" message not appearing.

### Priority 3 - Replay/Reset Functionality
- **Tests #5, #6**: `replay-flaky-detector.spec.js`, `replay-round-counter.smoke.spec.js`
  - Buttons staying disabled after replay.
  - Modal intercepts clicks.

### Priority 4 - Other Edge Cases
- **Test #16**: `snackbar-diagnostic.spec.js`
  - Strict mode violation with multiple snackbar elements.
- **Test #17**: `stat-selection.spec.js`
  - Timeout waiting for state transition.

## Recommendations

### Immediate Actions (Required to Complete Investigation)
1. **Document Current Status**: Run `npx playwright test playwright/battle-classic/` and record current pass/fail counts
2. **Fill in Placeholders**: Replace all `[YYYY-MM-DD]` with actual dates, add commit hashes
3. **Update Remaining Tests**: Document status of the 14 unresolved tests (fixed, still failing, or deprioritized)
4. **Add Completion Date**: Mark investigation as "Completed on YYYY-MM-DD" or "Abandoned - see reason"

### Investigation Needed (If Continuing)
1. **State Machine Audit**: Review transition logic between states:
   - File: `src/pages/battleClassic.init.js` and state handlers
   - Focus: `waitingForPlayerAction` entry/exit, `cooldown` handling, round advancement
   - Tool: Add console logging to trace state transitions

2. **Event Handler Verification**: Confirm event firing and handlers:
   - Events: `statSelected`, `roundStart`, `roundResolved`
   - Files: `src/helpers/classicBattle.js` and related event emitters
   - Test: Add event listeners in browser console during test runs

3. **Replay/Reset Logic**: Review reset mechanisms:
   - File: `src/helpers/classicBattle.js` (replay functionality)
   - Check: Button state reset, selection flag reset, modal handling
   - Pattern: Compare working vs failing replay scenarios

### Test Maintenance (Best Practices)
1. **Update Test Expectations**:
   - ✅ Fixed: `data-selected` attribute (doesn't exist) → use `selected` class
   - ✅ Fixed: `aria-label` expectations now match implementation
   - ⚠️ TODO: Verify all state transition expectations match current flow

2. **Improve Test Resilience**:
   ```javascript
   // ❌ Brittle: Expects exact state
   await waitForBattleState('cooldown');
   
   // ✅ Resilient: Accepts multiple valid states
   await waitForBattleState(['cooldown', 'roundOver', 'waitingForPlayerAction']);
   ```

3. **Add Retry Logic for Known Flaky Patterns**:
   ```javascript
   // For state checks that may transition quickly
   await expect(async () => {
     const state = await getBattleState();
     expect(['validState1', 'validState2']).toContain(state);
   }).toPass({ intervals: [100, 200, 500], timeout: 3000 });
   ```

## Files Modified

1.  `src/pages/battleClassic.html`: Added `data-testid="round-message"` to the relevant element.
2.  `playwright/battle-classic/keyboard-navigation.spec.js`: Updated test logic to correctly verify the round message element.
3.  `playwright/battle-classic/opponent-message.spec.js`: Modified `waitForBattleState` to accept multiple valid post-selection states for improved robustness.
4.  `playwright/battle-classic/snackbar-console-diagnostic.spec.js`: Corrected attribute check from `data-selected` to `selected` class (partial fix as snackbar still doesn't update).
5.  `playwrightTestFailures.md`: Documented all investigations and fixes in a structured format.

## Next Steps

### To Complete This Investigation:
1. **Run Current Test Suite**: `npx playwright test playwright/battle-classic/ --reporter=list` and record results
2. **Document Each Remaining Test**: Add entries for all 14 unresolved tests with current status
3. **Add Specific Dates**: Fill in all `[YYYY-MM-DD]` placeholders with actual investigation dates
4. **Link to Commits/PRs**: Add git references for all fixes mentioned
5. **Mark as Complete**: Add final status ("Investigation completed YYYY-MM-DD" or "Deprioritized - reason")

### If Continuing Investigation:
1. **Priority 1**: State transitions and selection reset (affects multiple tests - Pattern 1 & 2)
2. **Priority 2**: Event handler issues (snackbar updates, button state changes)
3. **Priority 3**: Replay/reset functionality (modal intercepts, button states)

### Quick Wins:
1. Run `git log --since="2025-12-01" --until="2025-12-31" -- src/helpers/classicBattle.js src/pages/battleClassic.init.js` to check for recent changes
2. Add debug logging to state machine to trace transitions during test runs
3. Compare test expectations against current implementation (some tests may have outdated assertions)

---

**Note**: This investigation identified:
- ✅ **3 Test Issues Fixed**: Wrong expectations (data attributes, state transitions)
- ⚠️ **14 Tests Unresolved**: Status unknown - may be application bugs, test issues, or already fixed
- 🔧 **Action Required**: Complete documentation or archive this investigation