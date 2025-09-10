# Analysis of timeoutInterrupt.cooldown.test.js Failure

This document outlines the investigation into the timeout failure of the unit test in `tests/helpers/classicBattle/timeoutInterrupt.cooldown.test.js`.

## Problem Description

The test `advances from cooldown after interrupt with 1s auto-advance` was failing with a 5000ms timeout error. The test is intended to verify that the classic battle state machine correctly handles a player selection timeout, transitions to a cooldown period, and then auto-advances to the next round.

## Validated Root Cause Analysis

### 1. Event Name Ecosystem Complexity (Validated: CONFIRMED)

The battle event system uses multiple distinct event names for similar concepts:
- **`roundTimeout`**: Emitted by `timerService.js` (line 226) when round timer expires
- **`control.countdown.started`**: Emitted by `roundManager.js` and `cooldowns.js` for internal countdown state
- **`nextRoundCountdownStarted`**: Emitted by `CooldownRenderer.js` for UI countdown events

**Promise Configuration** (from `promises.js` lines 100-101):
- `getRoundTimeoutPromise()` correctly listens for `roundTimeout` ✓
- `getCountdownStartedPromise()` listens for `nextRoundCountdownStarted` (not `control.countdown.started`)

**Impact**: Tests waiting for countdown events must use `nextRoundCountdownStarted`, not `control.countdown.started`.

### 2. Incomplete State Machine Implementation (Validated: CRITICAL ISSUE)

**State Table Contract** (`stateTable.js` line 68):
```javascript
// waitingForPlayerAction state documented onEnter handlers:
onEnter: ["prompt:chooseStat", "timer:startStatSelection", "a11y:exposeTimerStatus"]
```

**Actual Implementation** (`waitingForPlayerActionEnter.js`):
```javascript
export async function waitingForPlayerActionEnter() {
  emitBattleEvent("statButtons:enable");  // Only this - missing timer start!
}
```

**Impact**: No round timer is started, so `roundTimeout` events never fire, causing test timeouts.

### 3. Timer Architecture Assessment (Validated: MOSTLY ADDRESSED)

The codebase uses an injectable scheduler abstraction (`realScheduler` from `scheduler.js`) that works with fake timers. The main timer service (`timerService.startTimer()`) is designed to be testable, but it's never called because the state machine doesn't invoke it.

### 4. Test Environment Console Suppression (Validated: CONFIRMED)

Console output is intentionally muted in tests via:
- `process.env.VITEST` guards in various files
- `guard()` function wrapping console statements
- Agent instructions enforce "no unsuppressed console logs"

This makes debugging difficult but is by design for clean test output.

## Updated Recommendations

### Immediate Fixes Required:

1. **Implement Missing Timer Logic**: Add `startTimer()` call to `waitingForPlayerActionEnter.js` following the documented state contract.

2. **Ensure Scheduler Integration**: Use the injectable scheduler pattern for test compatibility.

3. **Verify Event Flow**: Confirm that `roundTimeout` → `interruptRound` → cooldown → `nextRoundCountdownStarted` flows correctly.

### Technical Debt:

1. **State Handler Audit**: Review all state handlers against their documented contracts in `stateTable.js`.

2. **Event Name Consolidation**: Consider standardizing the countdown event naming across the codebase.

3. **Debugging Infrastructure**: Implement battle state machine logging that can be enabled for debugging without violating console discipline.
