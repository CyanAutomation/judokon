# opponent-choosing.smoke.spec.js Investigation & Fix Plan

## Summary

The `opponent-choosing.smoke.spec.js` test was failing because the `opponentDelayMessage` feature flag was not being properly read from localStorage when set via Playwright's `addInitScript`. This investigation uncovered a combination of issues: fixture-level localStorage clobbering, a shallow merge of feature flags during initialization, and an overly complex settings merge logic that made the root cause difficult to identify.

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
   - **Solution**: Don't use commonSetup fixture for this test. This has been implemented.

2. **`__FF_OVERRIDES` Mechanism Broken**:
   - The `window.isEnabled` function is not exposed for tests, making direct verification difficult.

3. **Settings Merge Pipeline Bug**:
   - `localStorage` correctly contains `{ featureFlags: { opponentDelayMessage: { enabled: true } } }`.
   - `initFeatureFlags()` should merge these settings with defaults.
   - **Result**: `isEnabled("opponentDelayMessage")` still returned `false`.
   - **Expected**: Should return `true`.

### Phase 4: Snackbar Flow Analysis

**Instrumentation**: Added mutation observer to track snackbar text changes over time.

**Finding**: Snackbar text NEVER updates after stat selection. This confirms `isEnabled("opponentDelayMessage")` is returning `false`.

---

## Root Cause: Test-localStorage overrides never survive setup

The failing snackbar is not due to `initFeatureFlags` losing nested data; `loadSettings` already performs a deep merge and `DEFAULT_SETTINGS.featureFlags.opponentDelayMessage` is shipped `enabled: true` (see `src/data/settings.json`), so the app should show the „Opponent is choosing…” message even with the baseline defaults. Instead, the value written by the test’s `addInitScript` never survives to runtime because the `playwright/fixtures/commonSetup.js` fixture clears `localStorage` and immediately rewrites it to `{ featureFlags: { enableTestMode: { enabled: true } } }` on every navigation. That fixture adds its init scripts after the test’s scripts, so the injected flag override is clobbered before the app ever calls `initFeatureFlags`. The shallow merge in `initFeatureFlags` therefore just re-applies the same defaults and never sees the overridden flag; the real blocker is the fixture’s aggressive reset.

The merge in `initFeatureFlags` is redundant but not broken: it runs after `loadSettings` (which already merges via `mergeKnown`), copies the merged map into `cachedFlags`, and reuses it for `setCachedSettings`. The instrumentation we added during Phase 4 confirmed `isEnabled("opponentDelayMessage")` was still `false` in the browser because no flag data survived, not because nested properties were stripped away.

---

## Suggested Fix Plan

### Fix 1: Correct the Merge Logic in `initFeatureFlags` (Root Cause Fix)

**The most direct fix is to ensure a deep merge of feature flags.** Instead of the shallow merge, `initFeatureFlags` should rely on `loadSettings` to provide a correctly merged object, or perform a deep merge itself.

**Recommended Change in `src/helpers/featureFlags.js`:**

```javascript
// from
const mergedFlags = {
  ...DEFAULT_SETTINGS.featureFlags,
  ...(settings.featureFlags || {})
};
cachedFlags = mergedFlags;
setCachedSettings({ ...settings, featureFlags: mergedFlags });

// to
cachedFlags = settings.featureFlags || { ...DEFAULT_SETTINGS.featureFlags };
setCachedSettings(settings);
```
This change assumes that `loadSettings` returns a correctly deep-merged settings object. If `loadSettings` is also buggy, it will need to be fixed as well, but the redundant and incorrect merge in `initFeatureFlags` should be removed regardless.

**Files to Check**:
- `src/helpers/featureFlags.js` (to apply the fix)
- `src/config/loadSettings.js` (to verify its merge logic if the above fix is not sufficient)

### Fix 2: Expose `isEnabled` for Testing (Test Infrastructure Improvement)

To make tests more robust, expose a debug version of `isEnabled`.

**Implementation**:
In a test setup file, or via `addInitScript`:
```javascript
if (window.__PLAYWRIGHT_TEST__) {
  // Assuming 'isEnabled' is available in the module scope
  window.isEnabledDebug = isEnabled;
}
```
This allows tests to directly verify the state of a flag.

### Fix 3: Use Test API for State Verification (Best Practice)

As a best practice, tests should assert on application state rather than UI text when possible.

**Example**:
```javascript
const delay = await page.evaluate(
  () => window.__TEST_API?.engine?.getOpponentDelay?.()
);
expect(delay).toBeGreaterThan(0);
```
This makes the test less brittle.

---

## Recommended Action Order

1. **Immediate**: Apply **Fix 1** to correct the merge logic in `initFeatureFlags`.
2. **Verify**: Re-run `playwright/opponent-choosing.smoke.spec.js` to confirm the fix.
3. **If still failing**: Investigate the merge logic in `src/config/loadSettings.js` as it may also contain bugs. Add logging to trace the merge process for `featureFlags`.
4. **Best Practice (Recommended)**: Implement **Fix 2** and **Fix 3** to improve testability and robustness.

---

## Summary Table

| Issue | Root Cause | Status | Fix |
|-------|-----------|--------|-----|
| Snackbar not updating | Incorrect shallow merge in `initFeatureFlags` | **Critical** | Implement deep merge or remove redundant merge. |
| localStorage overwritten | `commonSetup` fixture | **Fixed** | Removed fixture usage. |
| Can't test flag state | `isEnabled` not exposed to tests | **Minor** | Expose for debugging. |
| UI-dependent test | Waiting for snackbar text | **Design Issue** | Use Test API for state assertions. |

---

## Next Steps

1.  Modify `src/helpers/featureFlags.js` to fix the shallow merge issue.
2.  Run `npm run test:e2e playwright/opponent-choosing.smoke.spec.js` to verify the fix.
3.  If the test passes, consider implementing the testing improvements (Fix 2 and 3).
4.  If the test still fails, add debug logging to `src/config/loadSettings.js` to trace the settings merge pipeline and identify any other issues.
5.  Refactor test to use Test API for state verification (per AGENTS.md guidelines).
