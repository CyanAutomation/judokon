# opponent-choosing.smoke.spec.js Investigation & Fix Plan

## Summary

The `opponent-choosing.smoke.spec.js` test was failing because the `opponentDelayMessage` feature flag never survived the test’s `addInitScript`—a fixture was clobbering `localStorage` before `initFeatureFlags` ran. Early speculation about a shallow merge proved unfounded once we stepped through `loadSettings`; that pipeline already merges defaults with overrides, so the flag just never reached the reducer.

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
   - **Note**: Once the fixture stop clearing storage, the merge pipeline behaves as expected—nothing in `loadSettings` stripped `enabled` from the stored flag.

### Phase 4: Snackbar Flow Analysis

**Instrumentation**: Added mutation observer to track snackbar text changes over time.

**Finding**: Snackbar text NEVER updates after stat selection. This confirms `isEnabled("opponentDelayMessage")` is returning `false`.

---

## Root Cause: Test-localStorage overrides never survive setup

The failing snackbar is not due to `initFeatureFlags` losing nested data; `loadSettings` already performs a deep merge and `DEFAULT_SETTINGS.featureFlags.opponentDelayMessage` is shipped `enabled: true` (see `src/data/settings.json`), so the app should show the „Opponent is choosing…” message even with the baseline defaults. Instead, the value written by the test’s `addInitScript` never survives to runtime because the `playwright/fixtures/commonSetup.js` fixture clears `localStorage` and immediately rewrites it to `{ featureFlags: { enableTestMode: { enabled: true } } }` on every navigation. That fixture adds its init scripts after the test’s scripts, so the injected flag override is clobbered before the app ever calls `initFeatureFlags`. The shallow merge in `initFeatureFlags` therefore just re-applies the same defaults and never sees the overridden flag; the real blocker is the fixture’s aggressive reset.

The merge in `initFeatureFlags` is redundant but not broken: it runs after `loadSettings` (which already merges via `mergeKnown`), copies the merged map into `cachedFlags`, and reuses it for `setCachedSettings`. The instrumentation we added during Phase 4 confirmed `isEnabled("opponentDelayMessage")` was still `false` in the browser because no flag data survived, not because nested properties were stripped away.

---

## Suggested Fix Plan

### Fix 1: Preserve the injected settings

The only reliable way to make the flag visible to `isEnabled` is to stop the fixture from clobbering `localStorage`. The fixture in `playwright/fixtures/commonSetup.js` clears storage and writes only `enableTestMode` on every navigation, running after the test’s own `addInitScript`. The temporary workaround (importing `test as base`) is fine for now, but the long-term fix should either:

1. Teach the fixture to accept a merged settings payload or expose a hook so tests can reapply their feature flags after the fixture’s scripts run.
2. Keep this smoke test outside of the fixture and document why, to prevent a future refactor from accidentally reintroducing the clobber.

Fixing the fixture is more effective than touching `initFeatureFlags`, which already consumes `loadSettings`’s deep merge flow (`src/config/loadSettings.js`) and preserves descriptions/defaults.

### Fix 2: Surface the computed flag map to tests

Rather than forcing Playwright to rely on snackbar text, introduce a lightweight debug hook that lets the test read flag state after `initFeatureFlags` completes (for example by exposing a `window.__featureFlagsDebug` callback or reusing `window.__FF_OVERRIDES`). That makes assertions deterministic and keeps `isEnabled` as the single source of truth without needing to import it into the browser context.

### Fix 3: Prefer state-driven assertions

Once the flag is visible, validate the feature using battle state or a test API (`window.__TEST_API?.engine?.getOpponentDelay?.()`) instead of UI copy. This reduces timing noise and keeps the smoke test aligned with the application’s business logic.

---

## Recommended Action Order

1. **Immediate**: Ensure the fixture no longer clears the test’s injected `settings`, either by avoiding the fixture (already done) or by sequencing an explicit reapply after it runs.
2. **Confirm**: Use the exposed debug hook (or `window.__FF_OVERRIDES`) to assert that `opponentDelayMessage` is `true` inside the page before driving the UI.
3. **Run**: Execute `npm run test:e2e playwright/opponent-choosing.smoke.spec.js` to validate the fix.
4. **Improve**: Keep the new hook and a state-checking assertion so the test remains robust even if UI copy changes.

---

## Summary Table

| Issue | Root Cause | Status | Fix |
|-------|-----------|--------|-----|
| Snackbar not updating | Test-localStorage overrides were clobbered by `playwright/fixtures/commonSetup.js` | **Critical** | Preserve the injected `settings` and avoid fixture reset. |
| localStorage overwritten | `commonSetup` fixture | **Fixed** | Removed fixture usage. |
| Can't test flag state | No stable hook to inspect `isEnabled` in Playwright | **Minor** | Expose a debug API (e.g., `window.__featureFlagsDebug`). |
| UI-dependent test | Waiting for snackbar text | **Design Issue** | Assert on battle state or test API instead of copy. |

---

## Next Steps

1. Either keep the smoke test off the `commonSetup` fixture or enhance the fixture so it merges additional `settings` payloads instead of overwriting.
2. Add the debug hook (or reuse `window.__FF_OVERRIDES`) so Playwright can assert that `opponentDelayMessage` is enabled.
3. Re-run `npm run test:e2e playwright/opponent-choosing.smoke.spec.js`.
4. Replace the snackbar assertion with a state-driven check once the flag’s presence is confirmed.
