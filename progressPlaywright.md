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

**Next Step**: The issue is not related to the mock changes. The problem is specifically with how the badge test handles feature flag initialization after a page reload.

## Next Steps

### Immediate Actions
1. **Revert Unit Test Changes**: Remove the `emitBattleEvent` mock addition and test if that resolves the broader test failures.

2. **Isolate the Feature Flag Issue**: Once basic tests pass, focus specifically on the badge visibility logic without introducing page reloads.

3. **Check Feature Flag Loading**: Investigate when and how feature flags are loaded during page initialization vs runtime.

### Deeper Investigation
1. **State Machine Debugging**: Add logging to understand why the battle gets stuck in `waitingForMatchStart` state.

2. **Modal vs Auto-start Logic**: Verify the conditions under which `initRoundSelectModal` chooses auto-start vs modal display.

3. **Badge Visibility Timing**: Investigate when `updateStateBadgeVisibility()` is called and whether it has access to the correct feature flag state.

### Alternative Approaches
1. **Avoid Page Reload**: Set feature flags in the initial `beforeEach` for this specific test instead of reloading.

2. **Manual State Transition**: If auto-start fails, manually trigger battle events to progress the state machine.

3. **Feature Flag Override**: Use runtime JavaScript to force the badge visibility instead of relying on the feature flag system.

## Technical Notes

### Key Files Involved
- `src/pages/battleCLI/init.js` - Main initialization logic
- `src/helpers/classicBattle/roundSelectModal.js` - Modal vs auto-start logic  
- `src/helpers/featureFlags.js` - Feature flag system
- `src/helpers/classicBattle/battleEvents.js` - Event system (potentially affected by mock changes)

### Key Functions
- `initRoundSelectModal()` - Decides modal vs auto-start
- `updateStateBadgeVisibility()` - Controls badge display
- `isEnabled("battleStateBadge")` - Feature flag check

### Test Flow Issues
1. `beforeEach` → sets storage → `page.goto()` → auto-start expected
2. Test-specific → `page.reload()` → storage re-evaluated → modal shown → battle doesn't progress

The core issue appears to be that `page.reload()` disrupts the expected initialization flow, and the battle doesn't properly start when the modal path is taken instead of the auto-start path.
