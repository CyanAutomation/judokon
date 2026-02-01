# Scoreboard Timer Test Failure - Root Cause Analysis and Fix

## Issue Summary

Unit tests in `tests/helpers/scoreboard.integration.test.js` were failing with:
```
Expected: "Time Left: 3s"
Received: "Time Left: 0s"
```

## Root Cause

The test was calling `startTimer()` without awaiting its async initialization:

```javascript
// ❌ BEFORE (incorrect)
const promise = startTimer(async () => {}, { selectionMade: false });
await vi.advanceTimersByTimeAsync(220);
expect(getTimerText()).toBe("Time Left: 3s"); // FAILS
```

### Why This Failed

1. `startTimer()` is an `async` function that performs several async operations:
   - Line 1116: `await resolveDuration(scoreboardApi)` - resolves timer duration
   - Line 1125: `primeTimerDisplay(...)` - updates scoreboard with initial value
   
2. When not awaited, the test advances fake timers before `primeTimerDisplay()` executes

3. The DOM still shows the default "0s" value instead of the primed "3s" value

## Fix

Await `startTimer()` to ensure async initialization completes:

```javascript
// ✅ AFTER (correct)
const timer = await startTimer(async () => {}, { selectionMade: false });
await vi.advanceTimersByTimeAsync(220);
expect(getTimerText()).toBe("Time Left: 3s"); // PASSES
```

### Changes Made

**File: `tests/helpers/scoreboard.integration.test.js`**

1. Line 185: Changed from `const promise = startTimer(...)` to `const timer = await startTimer(...)`
2. Line 202: Changed cleanup from `await promise` to `timer?.stop?.()`

## Secondary Issue: Symlinked Test Duplicates

### Problem

The repository had symlinked test directories that caused:
1. Duplicate test runs (same test run 3x through different paths)
2. Module resolution conflicts with symlinked paths
3. Flaky failures due to vitest treating symlinks as separate test files

### Symlink Locations

- `tests/battles-regressions/shared/scoreboard/` → `tests/helpers/scoreboard*.test.js`
- `tests/helpers/scoreboardTests/` → `tests/helpers/scoreboard*.test.js`

### Solution

Excluded symlinked directories from vitest discovery:

**File: `vitest.config.js`**

Added to exclude list:
```javascript
exclude: [
  // ... existing exclusions ...
  "tests/battles-regressions/**",
  "tests/helpers/scoreboardTests/**"
]
```

### Why This Works

1. npm scripts (`test:battles:shared`) reference actual file paths, not symlinks
2. Symlinks were organizational artifacts, not functional requirements
3. Excluding them prevents duplicate test runs and symlink-related failures
4. CI (`vitest run`) now only discovers actual test files

## Verification

All tests now pass:

```bash
# Direct test file
npm run test:battles:shared           # ✅ PASS (6 tests)

# Individual test
npx vitest run tests/helpers/scoreboard.integration.test.js  # ✅ PASS

# Symlinked paths properly excluded
npx vitest run tests/battles-regressions/shared/scoreboard/  # "No test files found"
```

## Key Takeaways

1. **Always await async test setup functions** - Even if the return value isn't immediately needed, async initialization must complete before assertions
2. **Avoid test file symlinks** - They cause module resolution conflicts and duplicate test runs in vitest
3. **Use explicit file paths in npm scripts** - More reliable than relying on vitest discovery patterns

## Related Files

- `tests/helpers/scoreboard.integration.test.js` - Fixed test file
- `vitest.config.js` - Excluded symlinked directories
- `src/helpers/classicBattle/timerService.js` - async `startTimer()` implementation
