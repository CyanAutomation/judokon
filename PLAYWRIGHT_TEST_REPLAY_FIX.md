# Playwright Test Timeout Fix: playwright/battle-classic/replay.spec.js

## Issue

The test `playwright/battle-classic/replay.spec.js` was failing with the following error:

```text
Error: Unable to capture initial engine scores: SCORES_UNAVAILABLE

Line 114:
throw new Error(`Unable to capture initial engine scores: ${reason}`);
```

This occurred in the test "Replay resets scoreboard after match end" when attempting to capture the initial engine state immediately after clicking the round select button.

## Root Cause

The test was trying to capture engine scores immediately after clicking `#round-select-2` without waiting for the round to fully initialize. The sequence was:

1. Click `#round-select-2` to start the match
2. **Immediately** call `captureEngineState(page)` (line 107)
3. The `captureEngineState` function tries to read scores via `engine.getScores()` or the inspect API
4. Both return null because the round initialization is still in progress

The problem is that the round goes through multiple initialization phases:

- **Phase 1**: Page loads, battle store created
- **Phase 2**: Player and opponent judoka selected and loaded with stat data (handled by `waitForRoundStats`)
- **Phase 3**: Battle state machine advances to "waitingForPlayerAction" where scores become available (NOT handled before the fix)

Without waiting for Phase 3, the engine scores are not yet accessible because the round state machine hasn't advanced to the point where scores are initialized.

## Why It Failed: Timing Issue

When `captureEngineState` is called, it checks for scores via:

```javascript
const readScores = (engineApi) => {
  if (engineApi && typeof engineApi.getScores === "function") {
    const scores = engineApi.getScores();
    // scores is null because round state hasn't reached "waitingForPlayerAction" yet
  }
  
  // Fallback to inspect API
  const inspectApi = window.__TEST_API?.inspect;
  const snapshot = inspectApi?.getBattleSnapshot?.();
  if (!snapshot) return null; // Also null - round not in correct state
};
```

At the moment `captureEngineState` is called (before the fix):

- The battle store and stats are loaded (waiting for stats would pass)
- BUT the battle state machine has not yet reached "waitingForPlayerAction"
- This state is where the engine initializes scores and prepares for player input
- Until that state is reached, both `engine.getScores()` and the inspect API snapshot return null

## Solution

Add a call to `waitForRoundStats` after clicking the round select button to ensure the round is fully initialized before attempting to capture engine scores.

### What `waitForRoundStats` Does

The `waitForRoundStats` helper waits for:

1. The battle store to be available
2. Both player and opponent judoka data to be loaded
3. Both players' stat values to be populated with actual numeric data

This ensures that the engine has been fully initialized and scores are available through the APIs.

### The Fix

```javascript
// Start match
await page.click("#round-select-2");
// Wait for the round to initialize with player and opponent judoka stats
await waitForRoundStats(page, { timeout: ENGINE_WAIT_TIMEOUT_MS });
// Wait for the battle state to be ready for player action
await waitForBattleState(page, "waitingForPlayerAction", { timeout: ENGINE_WAIT_TIMEOUT_MS });
// NOW safe to capture engine state and scores
const initialEngineState = await captureEngineState(page);
```

## Files Changed

- `playwright/battle-classic/replay.spec.js` - Line 3-8: Added `waitForBattleState` import
- `playwright/battle-classic/replay.spec.js` - Lines 112-115: Added `waitForRoundStats` and `waitForBattleState` calls after round selection

## Why This Pattern Works

The fix uses **two complementary waits**:

1. **`waitForRoundStats`**: Ensures player and opponent judoka data is loaded with stat values (power, speed, etc.)
2. **`waitForBattleState("waitingForPlayerAction")`**: Ensures the round state machine has advanced to the point where scores are available and the player can make a stat selection

This same pattern is used in the working test `playwright/battle-classic/replay-flaky-detector.spec.js`:

```javascript
// Start first match
await page.click("#round-select-2");

// Later in the loop:
for (let i = 0; i < iterations; i++) {
  if (i > 0) {
    await waitForRoundStats(page);  // ← Ensures stats are loaded
  }
  // ... perform actions ...
}
```

By ensuring the round is fully initialized (both stats loaded AND battle state ready), the test reliably captures engine state without race conditions.

## Related Code

- `playwright/helpers/battleStateHelper.js` - Contains `waitForRoundStats` implementation
- `src/helpers/testApi.js` - Exposes the `engine` API with `getScores()` method
- `src/helpers/battleEngineFacade.js` - Provides the underlying engine methods

## Prevention

When writing Playwright tests that interact with the battle engine:

1. After starting a round (clicking round select button), always call `waitForRoundStats` to ensure initialization is complete
2. Only then attempt to read engine state or scores via the Test API
3. This pattern ensures deterministic, race-condition-free tests

## Test Coverage

The test now properly covers:

1. Creating a quick match (points-to-win = 1)
2. Starting a round with full engine state verification
3. Playing through to match completion
4. Verifying replay resets the scoreboard
5. Confirming round counter resets to "Round 1"
