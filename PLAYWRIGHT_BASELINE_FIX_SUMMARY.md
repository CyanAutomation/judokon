# Playwright Baseline Snapshot Update Failure - Root Cause & Fix

## Problem

The `playwrightBaseline.yml` workflow was failing with:

```
Error: Playwright snapshot update failed. Check test stability.
```

## Root Cause

The `playwright.config.js` file had `reuseExistingServer: false` in the `webServer` configuration. This setting caused Playwright to attempt killing and restarting the dev server on every test run. In CI environments where the server was already running, this created a port conflict:

```
Error: http://localhost:5000 is already used, make sure that nothing is running on the port/url or set reuseExistingServer:true in config.webServer.
```

## Solution Implemented

### 1. Fixed `playwright.config.js`

**Changed:** `reuseExistingServer: false` → `reuseExistingServer: true`

**File:** `playwright.config.js` (line ~23)

**Effect:** Playwright now reuses an existing dev server instead of trying to kill and restart it. This eliminates port conflicts and allows tests to run successfully in CI and local environments.

### 2. Enhanced `playwrightBaseline.yml` Workflow

**Added process cleanup step** before snapshot updates:

```yaml
- name: Clean up any leftover processes
  run: |
    pkill -f "playwrightServer" || true
    sleep 2
```

**Added diagnostic information** in failure reporting:

```yaml
- name: Validate snapshot update
  if: steps.snapshot-update.outcome == 'failure'
  run: |
    echo "::error::Playwright snapshot update failed. Check test stability."
    echo "Playwright version: $(npx playwright --version)"
    echo "Node version: $(node --version)"
    echo "npm version: $(npm --version)"
    exit 1
```

**Effects:**

- Ensures any orphaned server processes are cleaned up before tests start
- Provides version context if failures occur (aids debugging)
- Clear separation between server management and test execution

## Validation

Tested multiple Playwright suites with snapshot updates after fix:

| Test Suite         | Tests | Result    |
| ------------------ | ----- | --------- |
| `homepage.spec.js` | 4     | ✅ Passed |
| `cli.spec.js`      | 1     | ✅ Passed |
| `settings.spec.js` | 12    | ✅ Passed |

**Total:** 17 tests passed with snapshot updates enabled.

## Why This Fix is Robust

1. **`reuseExistingServer: true`** is the recommended Playwright setting for:
   - CI/CD environments where servers are managed externally
   - Development workflows with persistent servers
   - Snapshot update operations that benefit from server reuse

2. **Process cleanup** ensures:
   - No orphaned processes from previous runs
   - Fresh start for each workflow execution
   - Prevents port conflicts in concurrent workflows

3. **Diagnostic logging** helps:
   - Future troubleshooting with environment context
   - Faster root cause analysis if issues reoccur
   - Better visibility into test environment state

## Files Modified

1. **`playwright.config.js`** — Changed webServer configuration
2. **`.github/workflows/playwrightBaseline.yml`** — Added cleanup and diagnostics steps

## Related Documentation

- Playwright config guide: [https://playwright.dev/docs/test-configuration](https://playwright.dev/docs/test-configuration)
- `reuseExistingServer` documentation: Allows reusing an existing web server instead of always starting a new one

## Next Steps (Optional Enhancements)

1. Add timeout configuration to webServer startup
2. Implement retry logic for snapshot updates
3. Add performance metrics to track snapshot update time trends
