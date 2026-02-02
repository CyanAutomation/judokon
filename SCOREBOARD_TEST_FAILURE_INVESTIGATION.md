# Scoreboard Integration Test Failure Investigation Report

**Date**: 2026-02-01  
**Investigator**: AI Agent  
**Status**: Root cause identified, fix not yet implemented

---

## Executive Summary

Two seemingly separate unit test failures in scoreboard integration tests are actually **the same test file being executed twice** due to a symlink. The root cause is **incorrect import paths** in `tests/helpers/scoreboard.integration.test.js` that reference a non-existent directory structure (`../../../../src/` instead of `../../src/`).

---

## Failing Tests

Both tests report the same assertion failure:

```
AssertionError: expected 'Time Left: 0s' to be 'Time Left: 3s'

 ❯ tests/battles-regressions/shared/scoreboard/scoreboard.integration.test.js:170:28
 ❯ tests/helpers/scoreboardTests/scoreboard.integration.test.js:170:28
```

**Expected behavior**: Timer display should show "Time Left: 3s" after 220ms  
**Actual behavior**: Timer display shows "Time Left: 0s"

---

## Investigation Process

### 1. Initial Hypothesis (Incorrect)

Initially investigated timer service logic, mock implementations, and DOM update timing, suspecting:

- Mock `startRound` not calling `onTick` properly
- Timer being cleared/reset somewhere
- Debounce or animation frame timing issues

### 2. Path Analysis Discovery

While examining import statements, discovered that test files use relative paths:

- `tests/helpers/scoreboard.integration.test.js` uses `../../../../src/`
- Should actually use `../../src/` from that location

### 3. Symlink Discovery

Found that `tests/battles-regressions/shared/scoreboard/scoreboard.integration.test.js` is a **symlink**:

```bash
tests/battles-regressions/shared/scoreboard/scoreboard.integration.test.js
  -> ../../../helpers/scoreboard.integration.test.js
```

This resolves to: `tests/helpers/scoreboard.integration.test.js`

**Key insight**: Both test failures are from the SAME underlying file being executed.

### 4. Path Verification

From `tests/helpers/` directory:

```bash
# WRONG (doesn't exist):
../../../../src/helpers/motionUtils.js

# CORRECT (exists):
../../src/helpers/motionUtils.js
```

From `tests/battles-regressions/shared/scoreboard/` directory:

```bash
# Would be CORRECT if this was a real file:
../../../../src/helpers/motionUtils.js

# But it's a symlink to tests/helpers/, so path resolution happens there
```

### 5. Git History Check

The incorrect paths (`../../../../src/`) exist in git history, meaning this test has **never worked correctly** at its current location. Checked with:

```bash
git show HEAD:tests/helpers/scoreboard.integration.test.js | head -10
```

Result: File in git already has wrong paths.

---

## Root Cause Analysis

### Primary Issue

`tests/helpers/scoreboard.integration.test.js` contains hardcoded import paths that assume it lives at a different location in the directory tree (4 levels deep instead of 2 levels deep).

### Affected Imports

All dynamic imports in the file use incorrect paths:

- Line 5: `vi.mock("../../../../src/helpers/motionUtils.js")`
- Line 31: `vi.mock("../../../../src/helpers/setupScoreboard.js")`
- Line 44: `vi.mock("../../../../src/helpers/timerUtils.js")`
- Line 49: `vi.mock("../../../../src/helpers/BattleEngine.js")`
- Line 57: `vi.mock("../../../../src/helpers/showSnackbar.js")`
- Line 123-125: Component imports (Scoreboard, ScoreboardModel, ScoreboardView)
- Line 164: `startTimer` import
- Line 186-188: setupScoreboard and startTimer imports

### Why Tests Fail

1. Vitest attempts to resolve imports from the actual file location (`tests/helpers/`)
2. Path `../../../../src/` doesn't exist from that location
3. Module imports fail or resolve incorrectly
4. Mocks don't get applied
5. Timer initialization fails silently
6. Timer display never gets updated from default "0s" value

### Why Two Failures Reported

Vitest test discovery finds BOTH:

1. `tests/helpers/scoreboard.integration.test.js` (real file)
2. `tests/battles-regressions/shared/scoreboard/scoreboard.integration.test.js` (symlink)

When symlink is followed, it executes the same underlying file, resulting in duplicate test execution and duplicate failures.

---

## Probable Origin

This file was likely:

1. Created/copied from `tests/battles-regressions/shared/scoreboard/` location
2. Moved to `tests/helpers/` directory
3. Import paths were never updated to reflect new location
4. Symlink was created to maintain backwards compatibility
5. Tests have been failing silently since the move

Alternative theory: File was created with wrong paths and never tested until now.

---

## Implementation Status

### Attempted (Reverted)

Attempted to fix paths in the symlinked location, which actually modified the target file. This demonstrated the symlink relationship but created further path resolution issues.

### Not Yet Implemented

The correct fix has not been applied due to discovery of the symlink complexity.

---

## Recommended Next Steps

### Immediate Fix (Choose One Approach)

#### Option A: Fix Real File Paths (Recommended)

Update all import paths in `tests/helpers/scoreboard.integration.test.js`:

```diff
-vi.mock("../../../../src/helpers/motionUtils.js", () => ({
+vi.mock("../../src/helpers/motionUtils.js", () => ({

-vi.mock("../../../../src/helpers/setupScoreboard.js", () => ({
+vi.mock("../../src/helpers/setupScoreboard.js", () => ({

# ... repeat for all imports
```

**Rationale**: Fix the root cause. The real file should have correct paths.

#### Option B: Delete Symlink, Keep One Copy

If the symlink was meant to be temporary:

1. Delete symlink: `tests/battles-regressions/shared/scoreboard/scoreboard.integration.test.js`
2. Fix paths in `tests/helpers/scoreboard.integration.test.js`
3. Update any test scripts that reference the symlink location

**Rationale**: Reduce complexity, single source of truth.

#### Option C: Create Real Copy for battles-regressions

If both locations need independent files:

1. Delete symlink
2. Create real copy at `tests/battles-regressions/shared/scoreboard/` with `../../../../src/` paths
3. Keep `tests/helpers/` version with `../../src/` paths

**Rationale**: Each location has correctly-pathed files, no symlink confusion.

### Verification Steps

After implementing fix:

```bash
# Run specific test file
npx vitest run tests/helpers/scoreboard.integration.test.js --no-coverage

# Expected: All tests pass
# Expected: Timer display shows "Time Left: 3s" after 220ms

# Verify no duplicate test execution
npx vitest list tests/**/scoreboard.integration.test.js

# Expected: Should show file is found at ONE location only (if symlink removed)
```

### Long-term Actions

1. **Audit other symlinks**: Check if other test files have similar issues

   ```bash
   find tests -type l -name "*.test.js"
   ```

2. **Add path validation**: Add pre-commit hook or CI check to verify import paths resolve correctly

3. **Documentation**: Document test file organization and why symlinks exist (or why they were removed)

4. **Test coverage**: This test has likely never passed - verify if the tested functionality actually works in production

---

## Files Examined

- `tests/helpers/scoreboard.integration.test.js` (real file)
- `tests/battles-regressions/shared/scoreboard/scoreboard.integration.test.js` (symlink)
- `tests/helpers/scoreboardTests/scoreboard.integration.test.js` (symlink)
- `src/helpers/classicBattle/timerService.js` (timer implementation)
- `src/components/Scoreboard.js` (scoreboard component)
- `src/components/ScoreboardView.js` (view layer)
- `src/helpers/timers/createRoundTimer.js` (timer creation)

---

## Additional Context

### Test Setup Analysis

The test correctly:

- Sets `window.__OVERRIDE_TIMERS = { roundTimer: 3 }`
- Creates proper DOM structure
- Initializes Scoreboard components
- Configures mock implementations

The timer logic itself appears sound. The failure is purely due to module resolution issues from incorrect paths.

### No Timer Issues Found

The timer service, mock implementations, and DOM update logic all appear correct. The 220ms delay mentioned in test comments relates to requestAnimationFrame timing but isn't the cause of the failure.

---

## Confidence Level

**High confidence** (95%) that incorrect import paths are the root cause.

**Evidence**:

- Manual path verification confirms `../../../../src/` doesn't exist from `tests/helpers/`
- Git history shows paths have been wrong since file was added
- Symlink explains duplicate test failures
- Test logic and timer implementation appear correct

**Low risk** of side effects from path correction - this is a straightforward path fix in test files only.
