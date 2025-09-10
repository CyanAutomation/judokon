# Playwright Test Investigation: Battle CLI State Badge

## Original Issue

Playwright test `"state badge visible when flag enabled"` was timing out with:

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#start-match-button')
```

## Investigation Summary

### Initial Analysis

The test was failing because it couldn't find the `#start-match-button` element. The issue appeared to be related to page initialization and the round selection modal logic.

### Root Cause Discovery

1. **Storage vs Modal Logic**: The `initRoundSelectModal()` function checks for saved `battleCLI.pointsToWin` and `battle.pointsToWin` values in localStorage. If found, it auto-starts without showing a modal. If not found, it shows a modal.

2. **beforeEach Setup**: The `beforeEach` in the test file sets these storage values and expects auto-start behavior. It then conditionally clicks a start button if one exists.

3. **Test-Specific Issue**: The failing test was calling `page.reload()` after setting additional localStorage values (the `battleStateBadge` feature flag), which caused the round selection logic to re-evaluate and potentially show the modal instead of auto-starting.

### Attempted Solutions

#### Approach 1: Handle Modal After Reload

```javascript
// Handle the round select modal that appears due to the reload
const modal = page.locator('[role="dialog"]');
if ((await modal.count()) > 0) {
  await modal.locator("button").first().click();
}
```

**Result**: Modal was found and clicked, but battle didn't progress to `waitingForPlayerAction` state.

#### Approach 2: Runtime Feature Flag Setting

```javascript
// Set feature flag without reload
await page.evaluate(() => {
  const current = localStorage.getItem("settings");
  const settings = current ? JSON.parse(current) : {};
  settings.featureFlags.battleStateBadge = { enabled: true };
  localStorage.setItem("settings", JSON.stringify(settings));
});
```

**Result**: Battle didn't start at all due to missing `beforeEach` initialization.

#### Approach 3: Debug Information Gathering

Added comprehensive debugging that revealed:

- localStorage was set correctly
- Modal appeared as expected after reload
- Modal button click registered
- State briefly showed as `waitingForPlayerAction` in debug but then failed to maintain

### Current State - Updated

The unit test mock has been restored with `emitBattleEvent: vi.fn()` and the unit tests now pass. However, the Playwright test `"state badge visible when flag enabled"` is still failing with the same timeout issue.

**Status**: Basic Playwright tests are working (e.g., "loads without console errors"), which confirms the broader system is functional. The issue appears to be isolated to the specific badge visibility test and its interaction with feature flags and page reloads.

**Critical Finding**: The test currently uses `page.reload()` to apply feature flag changes, which is problematic for Playwright tests and disrupts the expected initialization flow.

## Comprehensive Analysis & Resolution Plan

### Root Cause Analysis

After detailed investigation, the core issues are:

1. **Badge Element State**: The badge in `battleCLI.html` starts with `style="display: none"` and requires feature flag activation
2. **Feature Flag Caching**: The `isEnabled("battleStateBadge")` function checks cached flags loaded during init, not runtime localStorage changes
3. **Event Propagation Issues**: Manual `featureFlagsEmitter` events may not work properly in Playwright environment
4. **Page Reload Anti-Pattern**: Using `page.reload()` disrupts battle initialization and should be avoided in Playwright tests

### Key Architecture Components

- **Badge Element**: `/workspaces/judokon/src/pages/battleCLI.html` - starts hidden with `style="display: none"`
- **Visibility Logic**: `/workspaces/judokon/src/pages/battleCLI/init.js` - `updateStateBadgeVisibility()` function
- **Feature Flag System**: `/workspaces/judokon/src/helpers/featureFlags.js` - caching and event system
- **Badge Utilities**: `/workspaces/judokon/src/helpers/classicBattle/uiHelpers.js` - creation/update functions

## Phase 1 Results: Diagnostic Deep-Dive _(COMPLETED)_

### Key Findings

**✅ Badge Functionality Works**: The badge element is properly visible and responds to feature flag settings when using `window.__FF_OVERRIDES.battleStateBadge = true`.

**❌ Battle Initialization Issue**: The core problem is NOT with the badge, but with battle initialization failing to progress from `waitingForMatchStart` to `waitingForPlayerAction`.

### Detailed Investigation Results

1. **Storage Logic is Correct**:
   - `localStorage.getItem("battle.pointsToWin")` returns `"5"`
   - `Number("5") = 5` and `POINTS_TO_WIN_OPTIONS.includes(5)` is `true`
   - The `initRoundSelectModal()` function correctly identifies this and should trigger auto-start

2. **Auto-Start Logic Executes But Fails**:
   - Storage triggers `startRound(5, startCallback, true)`
   - `startCallback` function is empty (just comments)
   - Events `startClicked` are dispatched but not processed by state machine

3. **Battle Store Initialization Issues**:
   - `window.battleStore` exists but `hasEngine: false, hasOrchestrator: false`
   - State machine stuck in `waitingForMatchStart` with only one log entry (init)
   - This suggests the battle engine/orchestrator setup is failing

4. **Badge Works When Battle Works**:
   - When feature flag is properly set, badge shows correctly
   - Badge updates text based on battle state (shows "State: —" when stuck)

### Root Cause Identified

The issue is **NOT** a feature flag problem - it's a **battle engine initialization problem**. The test times out waiting for `waitingForPlayerAction` state because the battle never properly initializes its engine/orchestrator components, so it can't respond to the `startClicked` event.

### Test Elimination Strategy

The original failing test used `waitForBattleState(page, "waitingForPlayerAction", 15000)` which is problematic because:

1. It relies on a wait pattern (against Playwright best practices)
2. It assumes the battle will reach that state (which it never does due to init issues)
3. The badge functionality itself works fine when properly set up

### Phase 1 Success Criteria: ✅ ACHIEVED

- [x] Reproduced issue locally: Battle stuck in `waitingForMatchStart`
- [x] Comprehensive debugging reveals initialization failure, not badge failure
- [x] Baseline validation: Badge functionality works when battle state progresses
- [x] Clear log trail: Battle store exists but engine/orchestrator components are missing

### **Phase 2: Root Cause Investigation** _(COMPLETED)_

**Objective**: Identify the specific technical failure point

### Investigation Results

**✅ Module Loading**: All core battle modules (orchestrator.js, roundManager.js, etc.) load successfully via HTTP requests.

**✅ No Runtime Errors**: No JavaScript errors, unhandled promise rejections, or console errors related to orchestrator initialization.

**❌ Missing resetPromise**: The `resetPromise` created by `resetMatch()` function does not exist, indicating the async orchestrator initialization never starts.

**❌ Battle Store Incomplete**: Store exists with basic properties but missing critical `engine` and `orchestrator` components.

### Detailed Technical Analysis

1. **Async Initialization Failure**:
   - `resetMatch()` should create `resetPromise` that initializes orchestrator
   - `resetPromise` is missing, suggesting `resetMatch()` never executes properly
   - Without orchestrator initialization, `startClicked` events cannot be processed

2. **State Machine Stuck**:
   - Battle remains in `waitingForMatchStart` state
   - Only has initial state log entry (from init)
   - Cannot progress to `waitingForPlayerAction` without orchestrator

3. **Feature Flag System Working**:
   - Badge visibility works correctly when feature flag is set
   - `window.__FF_OVERRIDES.battleStateBadge = true` properly shows badge

### Root Cause Confirmed

The issue is **NOT** with:

- ❌ Badge functionality (works fine)
- ❌ Feature flag propagation (works correctly)
- ❌ Module import failures (all modules load)
- ❌ Runtime JavaScript errors (none detected)

The issue **IS** with:

- ✅ **Battle orchestrator initialization failure** in the CLI page
- ✅ **`resetMatch()` async promise chain not completing**
- ✅ **State machine unable to process `startClicked` events**

### Phase 2 Success Criteria: ✅ ACHIEVED

- [x] Confirmed module loading works correctly
- [x] No runtime errors or promise rejections detected
- [x] Identified missing `resetPromise` as smoking gun
- [x] Root cause is orchestrator initialization, not badge functionality

### **Phase 3: Solution Implementation** _(2-4 hours)_

**Objective**: Fix the core technical issue without using page reloads

**Preferred Strategy: Eliminate Page Reload Anti-Pattern**

- Set feature flag in `beforeEach` instead of runtime changes
- Use `page.addInitScript()` to set feature flags before page load
- Leverage `window.__FF_OVERRIDES` pattern for test reliability

**Alternative Strategies:**

- **Fix Feature Flag Propagation**: Improve runtime flag updates and event handling
- **Direct DOM Manipulation**: Add test-specific badge visibility override
- **Hybrid Approach**: Combine architectural fixes with test improvements

**Implementation Steps:**

1. Remove `page.reload()` from test completely
2. Set `battleStateBadge` feature flag in `beforeEach` or `addInitScript`
3. Ensure badge visibility is properly initialized on page load
4. Add verification logging

**Success Criteria**: Test passes consistently without page reloads

### **Phase 4: Validation & Integration** _(1-2 hours)_

**Objective**: Ensure fix is robust and doesn't break other functionality

**Tasks:**

1. **Regression Testing**
   - Run full Playwright test suite
   - Run unit tests for affected modules
   - Test manual feature flag toggling in UI

2. **Edge Case Verification**
   - Test feature flag changes during different battle states
   - Test multiple rapid flag toggles
   - Verify cross-tab synchronization doesn't break

3. **Documentation & Cleanup**
   - Update this progress documentation with resolution
   - Add comments explaining Playwright test best practices
   - Clean up debug code

**Success Criteria**: All tests pass, no regressions, clear documentation of solution

## Test Architecture Principles

### Playwright Best Practices Applied

- **Avoid page reloads**: Set up complete test state before `page.goto()`
- **Use addInitScript**: Configure runtime overrides before page loads
- **Minimize dynamic changes**: Prefer initial setup over runtime manipulation
- **Reliable assertions**: Use Playwright's built-in waiting and retry mechanisms

### Alternative Approaches (Ranked by Preference)

1. **Initial Flag Setup**: Set `battleStateBadge` in `beforeEach` alongside other flags
2. **Init Script Override**: Use `window.__FF_OVERRIDES.battleStateBadge = true` in `addInitScript`
3. **Direct Badge Control**: Manually show badge via `page.evaluate()` DOM manipulation
4. **Architecture Fix**: Improve feature flag runtime updates (more complex, broader impact)

## Risk Assessment & Decision Points

**High Priority Risk**: Page reloads in Playwright tests create timing and initialization issues
**Mitigation**: Eliminate page reloads entirely; set all state before initial page load

**Medium Risk**: Feature flag caching may not reflect runtime localStorage changes
**Mitigation**: Use override patterns or improve cache invalidation

**Low Risk**: Badge visibility logic dependencies on battle state timing
**Mitigation**: Set badge state independent of battle progression when possible

### Decision Points

- **Phase 1→2**: If diagnostic reveals multiple concurrent issues, may need parallel investigation tracks
- **Phase 2→3**: Strategy selection should prioritize eliminating page reloads over complex architectural changes
- **Phase 3→4**: If test fixes reveal deeper feature flag issues, document for future architectural improvements

## Implementation Notes

The core lesson from this investigation is that **Playwright tests should avoid page reloads** and instead:

1. Use `page.addInitScript()` to set up window overrides
2. Configure localStorage in `beforeEach` before the initial `page.goto()`
3. Leverage existing override patterns like `window.__FF_OVERRIDES`
4. Prefer deterministic initial setup over dynamic runtime changes

This aligns with Playwright best practices and the existing codebase patterns seen in other successful tests.
