# opponent-choosing.smoke.spec.js Investigation & Fix Plan

## Summary

The `opponent-choosing.smoke.spec.js` test was failing because the `opponentDelayMessage` feature flag was not being properly read from localStorage when set via Playwright's `addInitScript`. This investigation uncovered a combination of issues: fixture-level localStorage clobbering, feature flag initialization timing, and a deeper settings merge bug.

---

## Investigation Timeline & Findings

### Phase 1: Initial Test Failure

**Symptom**: Snackbar showing "First to 5 points wins." instead of "Opponent is choosing…" after stat selection
**Initial Hypothesis**: Auto-select feature was interfering

**Finding**: Auto-select WAS disabled successfully, but the snackbar message never changed after clicking a stat button.

### Phase 2: Test API & Navigation Issues

**Discovery**: Earlier in the session, fixed two critical bugs:

1. **Missing `await` in `battleStateHelper.js`** (line 178): `page.evaluate(async ...)` without `await` on Promise-returning calls caused Promise serialization errors
2. **Navigation pattern**: Tests needed `page.waitForURL()` before clicking links to properly wait for page load

**Resolution**: These were fixed in previous commits and tests now pass (auto-advance.smoke.spec.js, stat-hotkeys.smoke.spec.js)

### Phase 3: Feature Flag Override Mechanism Deep Dive

**Test**: Verified that stat click DOES work and transitions battle state correctly

- Stat selection properly updates `body[data-stat-selected=true]` ✓
- Battle state transitions from `waitingForPlayerAction` to `roundDecision` ✓
- BUT: Snackbar text never changes ✗

**Root Cause Investigation**:

1. **localStorage Clobbering** (commonSetup.js fixture):
   - The commonSetup fixture runs `addInitScript` that clears localStorage and ONLY sets `enableTestMode`
   - This runs AFTER the test's `addInitScript`, overwriting our feature flag settings
   - **Solution**: Don't use commonSetup fixture for this test

2. **__FF_OVERRIDES Mechanism Broken**:
   - Set `window.__FF_OVERRIDES = { opponentDelayMessage: true }` after page load
   - Verified the override was properly set on window
   - Called `isEnabled("opponentDelayMessage")`
   - **Result**: Returned `false` despite override being present
   - **Reason**: `window.isEnabled` function doesn't exist! The featureFlags module doesn't export to window
   - The application code imports `isEnabled` directly, so it works there, but test code can't call it

3. **Settings Merge Pipeline Bug** (most critical):
   - Created test with `addInitScript` setting localStorage BEFORE page load
   - Verified localStorage contains correct values: `{ featureFlags: { opponentDelayMessage: { enabled: true } } }`
   - Called `initFeatureFlags()` which should merge stored settings with defaults
   - **Result**: `isEnabled("opponentDelayMessage")` still returned `false`
   - **Expected**: Should return `true` since localStorage value should override defaults

### Phase 4: Snackbar Flow Analysis

**Instrumentation**: Added mutation observer to track snackbar text changes over time

**Finding**: Snackbar text NEVER updates after stat selection

- Initial: "First to 5 points wins." (shown on page load)
- After 3s: Fades away
- After stat click: NO UPDATE

**Code Analysis** (uiHelpers.js lines 800-815):

- When `delayOpponentMessage` is enabled, code should show "Opponent is choosing…"
- Logic path exists and looks correct
- **Conclusion**: `isEnabled("opponentDelayMessage")` must be returning `false` when the code runs

---

## Root Cause: Settings Merge Bug

The core issue is in `src/config/loadSettings.js`. When localStorage contains a partial `featureFlags` object:

```json
{
  "featureFlags": {
    "autoSelect": { "enabled": false },
    "opponentDelayMessage": { "enabled": true }
  }
}
```

The merge function SHOULD recursively merge flag-by-flag, preserving all unmentioned flags from defaults. However, the actual behavior appears to be replacing the entire featureFlags object or losing flags during merge.

**Evidence**:

- localStorage correctly stored: `{ featureFlags: { opponentDelayMessage: { enabled: true } } }`
- `loadSettings()` should merge with defaults and include ALL flags
- But when `initFeatureFlags()` caches the flags, `opponentDelayMessage` is not enabled

**Suspected Code Path** (loadSettings.js):

1. `mergeObject()` called recursively for nested objects ✓
2. `mergeKnown()` validates top-level keys only (line 58: `!(key in defaults)`)
3. For nested `featureFlags`, should iterate each flag... but merge behavior is unclear

---

## Suggested Fix Plan

### Fix 1: Don't Use commonSetup Fixture (Test-Level, Short-term)

**Status**: Already implemented

- Remove commonSetup fixture that clobbers localStorage
- Use base Playwright `test` instead
- This allows `addInitScript` to set localStorage before app initializes

**File**: `playwright/opponent-choosing.smoke.spec.js`
**Expected Result**: If settings merge works, test will pass

### Fix 2: Debug & Fix Settings Merge (Application-Level, Root Cause)

**Investigation Needed**:

1. Add console.debug logging to `loadSettings.js` `mergeObject()` to trace merge of featureFlags
2. Verify that localStorage values are preserved through merge pipeline
3. Trace `initFeatureFlags()` to confirm cachedFlags contains merged values

**Likely Fixes**:

- Ensure recursive merge preserves all keys from defaults that aren't overridden
- Add test case for partial localStorage override of featureFlags
- Consider exposing `isEnabled()` to `window` for test debugging

**Files to Check**:

- `src/config/loadSettings.js` - merge logic
- `src/helpers/featureFlags.js` - cache initialization
- `src/helpers/settingsStorage.js` - loadSettings wrapper

### Fix 3: Expose isEnabled for Testing (Test Infrastructure)

**Purpose**: Allow tests to verify feature flag state without relying on behavior

**Implementation**:

```javascript
// In a test setup or during test mode init
if (window.__PLAYWRIGHT_TEST__) {
  window.isEnabledDebug = (flag) => {
    // Can import and call actual isEnabled function
  };
}
```

**Benefit**: Tests can verify flags are working instead of waiting for snackbar text changes

### Fix 4: Alternative - Use Test API (Best Practice)

**Rather than relying on feature flags working correctly**:

- Use `window.__TEST_API` to query battle engine state directly
- Assert on `engine.getOpponentDelay()` or similar instead of snackbar text
- Less brittle than waiting for UI feedback

**Example**:

```javascript
// Instead of: await expect(snackbar).toContainText(/Opponent is choosing/i)
const delay = await page.evaluate(
  () => window.__TEST_API?.engine?.getOpponentDelay?.()
);
expect(delay).toBeGreaterThan(0); // Verifies opponent delay is configured
```

---

## Recommended Action Order

1. **Immediate**: Apply Fix 1 (remove commonSetup fixture) - DONE
2. **Verify**: Re-run test to see if basic localStorage merging works
3. **If still failing**: Apply Fix 2 & 3 (add logging, debug settings merge)
4. **Best Practice**: Apply Fix 4 (use Test API instead of UI assertions)

---

## Summary Table

| Issue | Root Cause | Status | Fix |
|-------|-----------|--------|-----|
| Snackbar not updating | `opponentDelayMessage` flag returns false | **Critical** | Fix settings merge bug |
| localStorage overwritten | commonSetup fixture | **Fixed** | Removed fixture usage |
| Can't test flag state | `window.isEnabled` not exposed | **Minor** | Expose for debugging |
| UI-dependent test | Waiting for snackbar text | **Design Issue** | Use Test API instead |

---

## Next Steps

1. Run opponent-choosing test with current fix (no commonSetup)
2. If failing: Add logging to loadSettings merge pipeline
3. Trace where featureFlags are lost/corrupted during settings initialization
4. Fix merge logic to properly handle partial feature flag overrides
5. Refactor test to use Test API for state verification (per AGENTS.md guidelines)

