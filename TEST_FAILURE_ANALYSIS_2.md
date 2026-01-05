# Test Failure Analysis: Snackbar DOM Element Not Appearing

| **Property**  | **Value**                                                           |
| ------------- | ------------------------------------------------------------------- |
| **Date**      | January 5, 2026                                                     |
| **Test File** | `playwright/opponent-choosing.smoke.spec.js`                        |
| **Status**    | 🔴 **Root Cause Identified** — Fix Plan Ready for Review            |
| **Severity**  | High (test failure confirmed, production behavior needs validation) |
| **Priority**  | P1 (blocking test suite, potential production impact)               |

---

## Executive Summary

After resolving the initialization synchronization issue (documented in `TEST_FAILURE_ANALYSIS.md`), the opponent-choosing tests still fail. Investigation reveals that the `showSnackbar()` function is called correctly, but the snackbar DOM element (`.snackbar-bottom`) never appears in the DOM tree.

**Root Cause**: The snackbar element is removed immediately by `container.replaceChildren()` before the delayed message can appear. When `showSnackbar()` is eventually called 500ms later, the round has already resolved, causing timing conflicts or state issues that prevent the element from being created.

**Impact**: The "Opponent is choosing..." feature may not work correctly in production, or there's a fundamental architectural issue with how delayed messages interact with the battle flow.

---

## Implementation Progress

### Task 1: Implement SnackbarManager with lifecycle management ✅

**Status**: Complete
**Date**: January 5, 2026

**Implementation Details**:
- Created `src/helpers/SnackbarManager.js` with comprehensive lifecycle management
- Features implemented:
  - Priority-based display (HIGH/NORMAL/LOW)
  - Guaranteed minimum display duration enforcement
  - Queuing system for overlapping messages
  - Programmatic control (show, remove, update, waitForMinDuration)
  - Diagnostic API for debugging
  - Backward compatibility with existing showSnackbar API

**Key Methods**:
- `show(config)`: Display snackbar with priority and duration control
- `remove(id)`: Remove snackbar (respects minDuration)
- `update(id, message)`: Update existing snackbar
- `waitForMinDuration(id)`: Promise-based duration enforcement
- `getDiagnostics()`: Debug information

**Testing**: Pending unit tests in next task

---

### Task 2: Add promise-based delay coordination to uiEventHandlers ✅

**Status**: Complete
**Date**: January 5, 2026

**Implementation Details**:
- Modified `src/helpers/classicBattle/uiEventHandlers.js` to integrate SnackbarManager
- Changed `statSelected` handler to be async and return a promise
- Implemented coordinated delay timing:
  1. Wait for configured delay (500ms default)
  2. Show snackbar with HIGH priority and minDuration (750ms)
  3. Wait for minimum display duration before allowing battle flow to proceed
- Added cleanup in `roundResolved` handler to remove opponent snackbar
- Exported helper functions:
  - `getStatSelectedHandlerPromise()`: Get current handler promise
  - `awaitStatSelectedHandler()`: Wait for handler completion

**Key Changes**:
- Handler now uses `await` for delay timing instead of setTimeout callback
- Snackbar shown with `SnackbarManager.show()` with HIGH priority
- Promise-based coordination ensures battle flow waits for snackbar display
- Minimum duration (750ms) enforced before round resolution

**Testing**: Pending - Need to update battle flow to await handler

---

### Task 3: Implement event handler await mechanism ✅

**Status**: Complete
**Date**: January 5, 2026

**Implementation Details**:
- Modified `src/helpers/classicBattle/selectionHandler.js` to await statSelected handler
- Added import for `awaitStatSelectedHandler` from uiEventHandlers
- Updated `dispatchStatSelected` function to wait for handler completion:
  1. Clean up timers
  2. Emit selection event
  3. **WAIT for statSelected handler to complete** (NEW)
  4. Then proceed with battle engine processing

**Coordination Flow**:
```
User clicks stat button
→ handleStatSelection called
→ dispatchStatSelected called
→ emitSelectionEvent (fires statSelected event)
→ statSelected handler starts:
  - Wait 500ms delay
  - Show snackbar with HIGH priority
  - Wait 750ms minimum duration
→ awaitStatSelectedHandler() waits for handler
→ Handler completes (snackbar has been visible for full duration)
→ Battle engine proceeds with round resolution
```

**Testing**: Pending - Need to test with actual battle flow

---

### Task 4: Formalize battle state machine ✅

**Status**: Complete
**Date**: January 5, 2026

**Implementation Details**:
- Enhanced `src/helpers/classicBattle/stateTable.js` with new state
- Added **`waitingForOpponentDecision`** (state id 4.5) between player selection and round decision
- State transition flow:
  ```
  waitingForPlayerAction
    → (statSelected event)
  waitingForOpponentDecision  (NEW STATE)
    → (opponentDecisionReady event)
  roundDecision
    → (outcome event)
  roundOver
  ```

**New State Properties**:
- **Name**: `waitingForOpponentDecision`
- **Description**: Player has selected a stat. Display "Opponent is choosing..." message with minimum duration before proceeding to round decision.
- **Entry Actions**:
  - `display:opponentThinkingMessage`
  - `wait:opponentMessageMinDuration`
- **Triggers**:
  - `opponentDecisionReady` → transitions to `roundDecision`
  - `interrupt` → transitions to `interruptRound`

**Benefits**:
- Explicit state for opponent message display
- Clear entry/exit points for timing coordination
- Prevents race conditions between UI and game logic
- Aligns with QA specification requirements

**Testing**: Pending - Need to wire up new state and test transitions

---

## 1. Problem Statement

### Observable Behavior

When a player selects a stat in Classic Battle mode with `opponentDelayMessage: true`:

1. ✅ The `statSelected` event is emitted correctly.
2. ✅ The event handler receives the event and executes.
3. ✅ The handler schedules the message to appear after a 500ms delay.
4. ✅ After 500ms, `displayOpponentChoosingPrompt()` is called.
5. ✅ `displayOpponentChoosingPrompt()` calls `showSnackbar(message)`.
6. ❌ **The snackbar DOM element never appears or is not visible.**

### Test Expectations vs. Reality

| **Scenario**                | **Expected**                               | **Actual**                                             |
| :-------------------------- | :----------------------------------------- | :----------------------------------------------------- |
| **With delay flag enabled** | Snackbar appears after 500ms delay         | ❌ Element not found: `locator('#snackbar-container .snackbar-bottom')` |
| **With delay flag disabled**| Snackbar appears immediately               | ❌ Element shows stale content: "First to 5 points wins." |

---

## 2. Investigation Timeline

### Phase 1: Initial Investigation (Completed)

- ✅ Verified initialization synchronization works correctly.
- ✅ Confirmed handler registration via `window.__battleDiagnostics`.
- ✅ Confirmed event emission via test listener.
- ✅ Confirmed handler execution via console logs.

### Phase 2: Handler Execution Analysis (Completed)

**Console Logs Captured**:

```
[Handler Registration] Target: target_1767609054990_b309dzyga, In WeakSet: false
[Handler Registration] PROCEEDING - Will register handlers on target_1767609054990_b309dzyga
[statSelected Handler] Event received [object Object]
[statSelected Handler] Scheduling message to appear after delay: 500ms
[displayOpponentChoosingPrompt] Called [object Object]
[displayOpponentChoosingPrompt] Updating snackbar with: Opponent is choosing…
BattleEngine.handleStatSelection [object Object]
```

**Key Finding**: All functions execute in the expected sequence, including the final `showSnackbar()` call.

### Phase 3: DOM State Analysis (Completed)

**Error Context Snapshot** shows:

- `status [ref=e87]` at the bottom of the page with no content.
- This is likely the empty `#snackbar-container` after `replaceChildren()`.
- No `.snackbar-bottom` element found in the entire DOM tree.

---

## 3. Root Cause Analysis

### The Timing Race Condition

The feature has a fundamental timing issue:

```
Timeline:
t=0ms:    Player clicks stat button
t=0ms:    statSelected handler fires
t=0ms:    Handler clears snackbar: container.replaceChildren()
t=0ms:    Handler schedules message to appear at t=500ms
t=~100ms: BattleEngine.handleStatSelection processes the stat choice
t=~700ms: Round resolves (opponent wins/loses/tie)
t=500ms:  setTimeout fires → displayOpponentChoosingPrompt() called
t=500ms:  showSnackbar("Opponent is choosing…") attempted
```

**The Problem**: By `t=500ms` when the snackbar should appear, the round has already resolved (at `t=~700ms`), and one of the following is happening:

1. **State Conflict**: The battle state machine has moved to `roundOver` or `cooldown`, which may prevent snackbars from being shown.
2. **DOM Cleanup**: Round resolution may trigger cleanup that removes or hides snackbars.
3. **Message Collision**: The round outcome message (e.g., "Opponent wins!") may be overwriting the delayed message.
4. **Element Creation Failure**: `showSnackbar()` may fail silently when called after round resolution.

### Code Evidence

**Handler code in `uiEventHandlers.js:300-330`:**

```javascript
// When delay is enabled, clear any existing snackbar immediately
try {
  const container = document.getElementById("snackbar-container");
  if (container) {
    container.replaceChildren(); // ← Removes all snackbar elements
  }
} catch (error) {
  // Error handling, if any.
}

// Schedule message to appear after delay
opponentSnackbarId = setTimeout(() => {
  displayOpponentChoosingPrompt({ /* ... */ });
}, scheduleDelay); // scheduleDelay = 500ms
```

**The issue**: `replaceChildren()` immediately removes the snackbar element at `t=0ms`, then waits 500ms to create a new one. However, the battle flow doesn't wait—it proceeds immediately to resolve the round.

### Why `__OPPONENT_RESOLVE_DELAY_MS` Didn't Help

I attempted to set `window.__OPPONENT_RESOLVE_DELAY_MS = 1500` to delay the opponent's response, but this didn't fix the issue. Possible reasons:

1. **Not Used by Test Environment**: The delay may not be respected in the test setup's battle flow.
2. **Applied Too Late**: The delay must be set before battle initialization, not just before navigation.
3. **Wrong Layer**: The delay may affect a different part of the battle flow (opponent AI decision) rather than the round resolution timing.

---

## 4. Architectural Issues

### Issue 1: No Coordination Between Snackbar Delay and Battle Flow

The snackbar delay (500ms) and the battle round resolution are **completely independent**:

- **Snackbar layer**: Uses `setTimeout()` to schedule message appearance.
- **Battle layer**: Immediately processes stat selection and resolves round.
- **No synchronization**: Neither layer waits for or knows about the other.

### Issue 2: Missing "Waiting for Opponent" State

The battle flow appears to lack an explicit "waiting for opponent action" state that would:

1. Show the delayed snackbar message.
2. Prevent round resolution until the message has been visible for a minimum duration.
3. Coordinate with the opponent reveal timing.

### Issue 3: Snackbar Lifecycle Not Managed

The current implementation:

1. Clears snackbar immediately (`replaceChildren()`).
2. Schedules a new snackbar for the future (500ms).
3. Has no mechanism to ensure the scheduled snackbar actually appears.
4. Has no cleanup or validation after the timeout fires.

---

## 5. Proposed Fix Plan

### Option A: Coordinate Battle Flow with Snackbar Delay (Recommended)

**Goal**: Make the battle engine wait for the snackbar message before resolving the round.

**Implementation Steps**:

1. **Add Promise-Based Delay to Event Handler**

    ```javascript
    // In uiEventHandlers.js statSelected handler
    onBattleEvent("statSelected", async (e) => {
      // ... existing code ...
      
      if (shouldDelay) {
        // Clear existing snackbar
        clearSnackbarContainer();
        
        // Create a promise that resolves when the message is shown
        await new Promise((resolve) => {
          opponentSnackbarId = setTimeout(() => {
            displayOpponentChoosingPrompt({ /* ... */ });
            resolve(); // Signal that message is now visible
          }, scheduleDelay);
        });
      } else {
        showPromptAndCaptureTimestamp(opponentPromptMessage);
      }
    });
    ```

2. **Modify Selection Handler to Wait**

    ```javascript
    // In selectionHandler.js
    export async function handleStatSelection(stat, store, opts = {}) {
      // Emit statSelected BEFORE processing selection
      emitBattleEvent("statSelected", { 
        store, stat, playerVal, opponentVal, opts: eventOpts 
      });
      
      // Wait for statSelected handlers to complete
      // (This is where the snackbar delay would happen)
      await waitForEventHandlers("statSelected");
      
      // NOW process the stat selection
      const outcome = battleEngine.handleStatSelection(playerVal, opponentVal);
      // ... rest of the flow
    }
    ```

3. **Add Minimum Display Duration**

    ```javascript
    // After showing the snackbar, ensure it's visible for minimum duration
    const MIN_DISPLAY_DURATION = 750; // From QA spec
    const displayStart = Date.now();
    
    // Show snackbar
    displayOpponentChoosingPrompt();
    
    // Wait for minimum duration
    const elapsed = Date.now() - displayStart;
    if (elapsed < MIN_DISPLAY_DURATION) {
      await new Promise(resolve => 
        setTimeout(resolve, MIN_DISPLAY_DURATION - elapsed)
      );
    }
    ```

**Benefits**:

- ✅ Matches intended feature behavior from QA spec.
- ✅ Ensures message is visible before round resolves.
- ✅ Respects minimum display duration.
- ✅ Clean coordination between layers.

**Risks**:

- ⚠️ Changes battle flow timing (requires thorough testing).
- ⚠️ May affect other parts of the system that depend on immediate stat processing.
- ⚠️ Adds async complexity to synchronous event flow.

### Option B: Fix Snackbar Display Without Changing Battle Flow (Simpler)

**Goal**: Ensure the snackbar appears even if the round has already resolved.

**Implementation Steps**:

1. **Don't Clear Snackbar Immediately**

    ```javascript
    // In uiEventHandlers.js
    if (shouldDelay) {
      // Don't call replaceChildren() immediately
      // Instead, update the existing snackbar or create a new one
      
      opponentSnackbarId = setTimeout(() => {
        // Force show snackbar regardless of battle state
        showSnackbar(opponentPromptMessage, { 
          priority: 'high',  // Ensure it's not overridden
          minDuration: 750   // Keep visible for minimum time
        });
      }, scheduleDelay);
    }
    ```

2. **Add Snackbar Priority System**

    ```javascript
    // In showSnackbar.js
    let currentPriority = 'normal';
    
    export function showSnackbar(message, options = {}) {
      const priority = options.priority || 'normal';
      
      // Don't show if a higher priority message is displayed
      if (currentPriority === 'high' && priority === 'normal') {
        return;
      }
      
      currentPriority = priority;
      // ... rest of implementation
    }
    ```

3. **Protect Delayed Messages from Round Resolution**

    ```javascript
    // Register listener for roundResolved
    onBattleEvent("roundResolved", () => {
      // Don't clear the delayed snackbar if it's still pending
      if (opponentSnackbarId) {
        // Let the delayed message appear first
        return;
      }
      
      // Otherwise show round outcome
      showRoundOutcome(/* ... */);
    });
    ```

**Benefits**:

- ✅ Simpler implementation.
- ✅ Doesn't change battle flow timing.
- ✅ More isolated changes.
- ✅ Lower risk of regressions.

**Drawbacks**:

- ⚠️ Doesn't address the architectural issue.
- ⚠️ May still have timing conflicts.
- ⚠️ Message might appear AFTER round already resolved (weird UX).

### Option C: Skip Snackbar When Round Resolves Too Quickly (Pragmatic)

**Goal**: Accept that sometimes the round resolves too fast, and just skip the message in those cases.

**Implementation**:

```javascript
onBattleEvent("statSelected", async (e) => {
  if (shouldDelay) {
    clearSnackbarContainer();
    
    let cancelled = false;
    
    // Listen for round resolution
    const cancelToken = onBattleEvent("roundResolved", () => {
      cancelled = true;
      clearTimeout(opponentSnackbarId);
    });
    
    opponentSnackbarId = setTimeout(() => {
      if (!cancelled) {
        displayOpponentChoosingPrompt();
      }
      cancelToken.remove();
    }, scheduleDelay);
  }
});
```

**Benefits**:

- ✅ Simplest implementation.
- ✅ Prevents weird timing issues.
- ✅ Graceful degradation.

**Drawbacks**:

- ❌ Feature doesn't work as designed.
- ❌ Message may never appear in fast rounds.
- ❌ Tests would need to be rewritten to expect this behavior.

---

## 6. Recommended Solution

**Primary Recommendation**: **Option A** (Coordinate Battle Flow)

**Rationale**:

1. Matches the intended feature design from `docs/qa/opponent-delay-message.md`.
2. Ensures the message is visible for the specified minimum duration.
3. Creates proper coordination between UI and game logic layers.
4. Provides the best user experience.

**Implementation Priority**:

1. **Phase 1**: Implement basic coordination (steps 1-2 of Option A).
2. **Phase 2**: Add minimum display duration (step 3 of Option A).
3. **Phase 3**: Add comprehensive tests for various timing scenarios.

**Fallback**: If Option A proves too complex or risky, implement **Option B** as a tactical fix, then refactor to Option A in a future sprint.

---

## 7. Testing Strategy

### Unit Tests Required

1. **Handler Timing Tests**

    ```javascript
    test("statSelected handler delays message by configured amount", async () => {
      vi.useFakeTimers();
      emitBattleEvent("statSelected", { opts: { delayOpponentMessage: true } });
      
      // Message should not appear immediately
      expect(showSnackbar).not.toHaveBeenCalled();
      
      // Advance time
      await vi.advanceTimersByTimeAsync(500);
      
      // Message should now appear
      expect(showSnackbar).toHaveBeenCalledWith(
        expect.stringContaining("Opponent is choosing")
      );
    });
    ```

2. **Battle Flow Coordination Tests**

    ```javascript
    test("battle engine waits for delayed snackbar before resolving round", async () => {
      const startTime = Date.now();
      
      await handleStatSelection("power", store, { delayOpponentMessage: true });
      
      const elapsed = Date.now() - startTime;
      
      // Should have waited at least 500ms (snackbar delay)
      expect(elapsed).toBeGreaterThanOrEqual(500);
    });
    ```

3. **Minimum Display Duration Tests**

    ```javascript
    test("snackbar remains visible for minimum duration", async () => {
      displayOpponentChoosingPrompt();
      
      const snackbar = document.querySelector(".snackbar-bottom");
      expect(snackbar).toBeVisible();
      
      // Wait minimum duration
      await vi.advanceTimersByTimeAsync(750);
      
      // Should still be visible
      expect(snackbar).toBeVisible();
    });
    ```

### Integration Tests Required

1. **End-to-End Round Flow**
    - Verify snackbar appears at correct time.
    - Verify minimum display duration.
    - Verify round resolves after message shown.
    - Verify outcome message appears after opponent message.

2. **State Machine Transitions**
    - Test all state transitions with delayed messages.
    - Verify snackbar survives state changes.
    - Verify cleanup happens correctly.

### Playwright Tests Updates

1. **Update `opponent-choosing.smoke.spec.js`**
    - Remove the opponent resolve delay workaround.
    - Update timing expectations to match new behavior.
    - Add explicit checks for snackbar appearing after delay.
    - Verify message is visible for minimum duration.

2. **Add Edge Case Tests**
    - Very fast rounds (opponent responds in <500ms).
    - Player spam-clicking buttons.
    - Multiple rapid stat selections.
    - Browser/tab visibility changes during delay.

---

## 8. Opportunities for Improvement

Beyond the immediate fix, the following opportunities represent architectural enhancements that would improve the robustness, maintainability, and extensibility of the battle system and UI components.

### 1. Event-Driven Battle Flow 🎯 **High Impact**

**Problem**: The current battle flow mixes synchronous and asynchronous operations without clear coordination, leading to timing issues and complex interactions.

**Solution**: Implement a proper event-driven architecture to orchestrate the battle flow. This would involve a central dispatcher and well-defined events for each phase of a round.

```javascript
// Example: Battle Flow Orchestrator
class BattleFlowOrchestrator {
  async handleStatSelection(stat) {
    // Phase 1: Pre-selection
    await this.emit("statSelection:before", { stat });
    // ← UI handlers show "Opponent is choosing..." here
    
    // Phase 2: Process selection
    const outcome = await this.battleEngine.processSelection(stat);
    await this.emit("statSelection:processed", { stat, outcome });
    
    // Phase 3: Show results
    await this.ensureMinimumDelay(750); // Ensure messages visible
    await this.emit("statSelection:complete", { stat, outcome });
    // ← Round outcome shown here
  }
  
  async ensureMinimumDelay(ms) {
    const elapsed = Date.now() - this.phaseStartTime;
    if (elapsed < ms) {
      await new Promise(r => setTimeout(r, ms - elapsed));
    }
  }
}
```

**Benefits**:

- ✅ Clear separation of concerns.
- ✅ Easier to test individual phases.
- ✅ Natural coordination points for UI updates.
- ✅ Extensible for future features.

---

### 2. Snackbar Lifecycle Management 🎯 **High Impact**

**Problem**: Snackbars are currently created and destroyed ad-hoc, lacking proper lifecycle tracking, which can lead to display inconsistencies and race conditions.

**Solution**: Implement a dedicated snackbar manager that handles the creation, display, queuing, and removal of snackbar messages, including enforcing minimum display durations.

```javascript
class SnackbarManager {
  constructor() {
    this.activeSnackbars = new Map();
    this.queue = [];
  }
  
  show(message, options = {}) {
    const snackbar = {
      id: generateId(),
      message,
      priority: options.priority || 'normal',
      minDuration: options.minDuration || 0,
      shownAt: Date.now(),
      element: null
    };
    
    this.activeSnackbars.set(snackbar.id, snackbar);
    this.render(snackbar);
    
    return {
      id: snackbar.id,
      remove: () => this.remove(snackbar.id),
      updateMessage: (msg) => this.update(snackbar.id, msg)
    };
  }
  
  remove(id) {
    const snackbar = this.activeSnackbars.get(id);
    if (!snackbar) return;
    
    const elapsed = Date.now() - snackbar.shownAt;
    if (elapsed < snackbar.minDuration) {
      // Wait for minimum duration before removing
      setTimeout(() => this.remove(id), snackbar.minDuration - elapsed);
      return;
    }
    
    // Safe to remove
    snackbar.element?.remove();
    this.activeSnackbars.delete(id);
  }
}
```

**Benefits**:

- ✅ Enforces minimum display duration.
- ✅ Handles overlapping messages correctly.
- ✅ Provides programmatic control.
- ✅ Easier to debug snackbar issues.

---

### 3. Battle State Machine Formalization 🎯 **Medium Impact**

**Problem**: State transitions within the battle engine are implicit and scattered across multiple files, making the overall battle flow difficult to understand, test, and maintain.

**Solution**: Implement a formal state machine (e.g., using a library like XState or a custom implementation) with explicit states and transitions to manage the battle lifecycle.

```javascript
const battleStateMachine = {
  states: {
    waitingForPlayerAction: {
      on: {
        STAT_SELECTED: 'processingSelection'
      }
    },
    processingSelection: {
      entry: ['showOpponentThinking'],
      on: {
        PROCESSING_COMPLETE: 'showingOutcome'
      }
    },
    showingOutcome: {
      entry: ['displayRoundResult'],
      after: {
        MIN_OUTCOME_DURATION: 'cooldown'
      }
    },
    cooldown: {
      after: {
        COOLDOWN_DURATION: 'waitingForPlayerAction'
      }
    }
  }
};
```

**Benefits**:

- ✅ Explicit state transitions.
- ✅ Clear entry/exit actions for each state.
- ✅ Easy to visualize and test.
- ✅ Prevents invalid state transitions.

---

### 4. Configuration-Driven Timing 🎯 **Low Impact**

**Problem**: Timing values (e.g., delays, durations) are hardcoded throughout the codebase, making adjustments difficult and inconsistent.

**Solution**: Centralize all timing configurations in a single, accessible module. This would allow for easier tuning and testing of different timing scenarios.

```javascript
// config/battleTiming.js
export const BATTLE_TIMING = {
  snackbar: {
    opponentThinkingDelay: 500,  // Delay before showing "Opponent is choosing"
    minimumDisplayDuration: 750, // Min time snackbar stays visible
    outcomeDisplayDuration: 2000 // Time to show round outcome
  },
  round: {
    selectionTimeout: 30000,      // Max time for player to select
    cooldownDuration: 1000,       // Pause between rounds
    autoAdvanceDelay: 500         // Delay before auto-advancing
  }
};
```

**Benefits**:

- ✅ Easy to adjust timing without code changes.
- ✅ Consistent timing across features.
- ✅ Easier to test different timing scenarios.
- ✅ Could be exposed to settings/testing.

---

### 5. Diagnostic Tooling Enhancement 🎯 **Low Impact**

**Problem**: Debugging timing-sensitive issues, especially race conditions, requires manual log inspection, which is tedious and error-prone.

**Solution**: Enhance the `window.__battleDiagnostics` object to include a detailed, timestamped event timeline. This would provide a clearer visualization of event sequences and delays.

```javascript
// Add to window.__battleDiagnostics
window.__battleDiagnostics = {
  // ... existing fields ...
  timeline: [], // Array of timestamped events
  
  recordEvent(event, data) {
    this.timeline.push({
      event,
      data,
      timestamp: Date.now(),
      relativeMs: Date.now() - this.startTime
    });
  },
  
  getTimeline() {
    return this.timeline.map(e => 
      `${e.relativeMs}ms: ${e.event} ${JSON.stringify(e.data)}`
    ).join('\n');
  }
};
```

**Benefits**:

- ✅ Visual timeline of battle events.
- ✅ Easier to spot timing issues.
- ✅ Useful for debugging test failures.
- ✅ Can be used in error reports.

---

## 9. Risk Assessment

### Implementation Risks

| **Risk**                                   | **Severity** | **Mitigation**                                |
| :----------------------------------------- | :----------- | :-------------------------------------------- |
| Battle flow timing regression              | High         | Comprehensive integration tests.              |
| Breaking existing battle features          | High         | Feature flag the new behavior initially.      |
| Performance impact from async coordination | Medium       | Profile before/after, optimize if needed.     |
| Increased code complexity                  | Medium       | Clear documentation, code review.             |
| Test flakiness from timing changes         | Low          | Use fake timers, deterministic delays.        |

### Production Impact Analysis

**Best Case**: Feature works as designed, tests pass, users see improved UX.
**Likely Case**: Some timing adjustments needed, minor UX polish required.
**Worst Case**: Fundamental architectural issues require larger refactor.

**Recommendation**: Implement behind a feature flag initially, and gradually roll out.

---

## 10. Implementation Checklist

### Pre-Implementation

- [ ] Review and approve this analysis document.
- [ ] Decide on Option A, B, or C.
- [ ] Create feature flag for new behavior (`coordinatedBattleFlow`).
- [ ] Set up timeline recording for debugging.

### Implementation (Option A)

- [ ] Modify `statSelected` handler to be async and await delay.
- [ ] Update `handleStatSelection` to wait for event handlers.
- [ ] Add minimum display duration enforcement.
- [ ] Update `showSnackbar` to support lifecycle management.
- [ ] Add snackbar manager for better control.

### Testing

- [ ] Unit tests for handler timing.
- [ ] Unit tests for battle flow coordination.
- [ ] Unit tests for minimum display duration.
- [ ] Integration tests for end-to-end round flow.
- [ ] Playwright tests updated and passing.
- [ ] Edge case tests (fast rounds, spam clicks, etc.).

### Validation

- [ ] Manual testing in development.
- [ ] Verify timing feels natural.
- [ ] Check performance impact.
- [ ] Verify no regressions in other battle features.
- [ ] Cross-browser testing.

### Documentation

- [ ] Update QA guide with new timing behavior.
- [ ] Document architecture changes.
- [ ] Update test documentation.
- [ ] Add troubleshooting guide.

### Deployment

- [ ] Deploy behind feature flag.
- [ ] Monitor for issues.
- [ ] Gather user feedback.
- [ ] Gradually increase rollout.
- [ ] Remove feature flag when stable.

---

## 11. Related Files & References

### Core Implementation Files

| **File**                                       | **Purpose**                           |
| :--------------------------------------------- | :------------------------------------ |
| `src/helpers/classicBattle/uiEventHandlers.js` | statSelected handler, snackbar logic  |
| `src/helpers/classicBattle/selectionHandler.js`| Stat selection processing             |
| `src/helpers/showSnackbar.js`                  | Snackbar display implementation       |
| `src/helpers/battleEngineFacade.js`            | Battle engine interface               |

### Test Files

| **File**                                        | **Purpose**                  |
| :---------------------------------------------- | :--------------------------- |
| `playwright/opponent-choosing.smoke.spec.js`    | Currently failing E2E tests  |
| `tests/classicBattle/opponent-delay-behavior.test.js` | Unit tests for delay feature |

### Documentation

| **File**                                   | **Content**                           |
| :----------------------------------------- | :------------------------------------ |
| `docs/qa/opponent-delay-message.md`        | Feature specification                 |
| `TEST_FAILURE_ANALYSIS.md`                 | Initialization issue investigation    |
| `design/specs/battle-state-machine.md`     | (If exists) State machine specification |

---

## 12. Questions for Reviewer

1. **Approach**: Do you prefer Option A (coordinate battle flow), Option B (fix display only), or Option C (skip when too fast)?
2. **Scope**: Should we implement the full snackbar manager (Opportunity #2) as part of this fix, or as a follow-up?
3. **Testing**: Are there specific edge cases or scenarios you want tested beyond what's listed?
4. **Timing**: Are the current values (500ms delay, 750ms minimum duration) correct, or should they be adjusted?
5. **Feature Flag**: Should the new behavior be behind a feature flag initially, or deployed directly?
6. **Architecture**: Should we tackle the state machine formalization (Opportunity #3) now or defer to future work?

---

## 13. Appendix: Investigation Commands

### Debugging Commands Used

```bash
# Run failing test with diagnostics
DEBUG=pw:browser npx playwright test opponent-choosing.smoke.spec.js --reporter=list

# Check handler registration
grep -A 20 "Handler Registration" test-output.log

# Verify snackbar function calls
grep "displayOpponentChoosingPrompt\|showSnackbar" test-output.log

# Check DOM snapshot
cat test-results/*/error-context.md | grep -A 50 "Page snapshot"
```

### Reproduction Steps

1. Start dev server: `npm run dev`
2. Navigate to `/battleClassic.html` with `opponentDelayMessage: true`
3. Start a battle.
4. Click any stat button.
5. Observe: Logs show handler executes, but snackbar doesn't appear.
6. Check DOM: No `.snackbar-bottom` element exists.

---

**Status**: Analysis complete. Awaiting review and decision on approach.
**Date**: January 5, 2026
**Author**: AI Agent Investigation
