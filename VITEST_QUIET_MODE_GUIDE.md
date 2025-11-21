# Vitest Quiet Mode Configuration

## Overview

Vitest output has been optimized to be quieter by default. Debug logs and performance metrics are now suppressed during test runs.

## What's Suppressed

The following are now muted by default during test runs:

1. **Debug flag performance logs** (`[debugFlagPerf]`)
   - Suppressed via `window.__DEBUG_PERF__ = false`
   - Applies to: `src/helpers/debugFlagPerformance.js`

2. **Display mode mapping logs** (`displayMode: mapped legacy value...`)
   - Suppressed via console.info muting
   - Applies to: `src/helpers/displayMode.js`

3. **Debug log statements** (`[DEBUG]`, `[debug]`)
   - Suppressed via console.log muting
   - Applies to: Various battle helpers and pages

4. **Stdout/stderr writes**
   - Process stdout/stderr are redirected to no-op during tests

## Console Methods Muted

In test setup, the following console methods are muted by default:

- `console.log`
- `console.info`
- `console.warn`
- `console.error`
- `console.debug`

## Enabling Logs for Debugging

To see full console output during test runs, set the `SHOW_TEST_LOGS` environment variable:

```bash
# See all logs (including test framework messages and debug output)
SHOW_TEST_LOGS=1 npm test

# Or for specific test file
SHOW_TEST_LOGS=1 npm test -- tests/helpers/debugFlagHud.test.js

# Or in watch mode
SHOW_TEST_LOGS=1 npm run test:watch
```

## Implementation Details

### Configuration Location

Changes were made in `tests/setup.js`:

1. **Early module-level muting** (lines 20-36):

   ```javascript
   // Suppress debug flag performance logs in tests
   window.__DEBUG_PERF__ = false;
   window.__LOG_DEBUG_FLAG_PERF__ = false;
   window.__PROFILE_DEBUG_FLAGS__ = false;
   ```

2. **Console muting** (via `muteConsole()` in `applyConsoleMuting()`):
   - Added `"info"` to the muted levels
   - Ensures `console.info()` calls from debugFlagPerformance are suppressed

3. **Console restoration** (in `afterEach`):
   - Also restored `"info"` along with other console methods

### Console Utility

The console utility in `tests/utils/console.js` handles:

- `muteConsole(levels)` - Set methods to no-op
- `restoreConsole(levels)` - Restore to originals
- `withMutedConsole(fn)` - Temporarily mute during function execution
- `withAllowedConsole(fn)` - Temporarily unmute during function execution

## Test Output Comparison

### Before

```
[23:05:28] roundStart -> Round resolved
·················································
[debugFlagPerf] layoutDebugPanel duration: 0.01ms
[debugFlagPerf] layoutDebugPanel duration: 0.01ms
[debugFlagPerf] tooltipOverlayDebug duration: 0.02ms
···stdout | tests/helpers/debugFlagHud.test.js > ...
displayMode: mapped legacy value "retro" to "dark"
···stdout | tests/helpers/displayMode.test.js > ...
[DEBUG] syncScoreDisplay called: { playerScore: 0, opponentScore: 0 }
```

### After

```
 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  23:09:52
   Duration  2.17s (transform 580ms, setup 192ms, collect 24ms, tests 1.02s, environment 420ms, prepare 96ms)
```

## Selective Logging in Tests

To allow specific console output in a single test:

```javascript
import { withAllowedConsole } from "../utils/console.js";

test("my test with logs", async () => {
  await withAllowedConsole(async () => {
    // console.log/info/warn/error will work here
    myFunctionThatLogs();
  }, ["log", "info"]);
});
```

## Notes

- This configuration applies only to **test runs** (when `VITEST` env is set)
- Production code behavior is unchanged
- Individual tests can opt-in to logging via `withAllowedConsole()`
- The muting is refreshed before each test (in `beforeEach`)
- Muting is restored after each test (in `afterEach`)
