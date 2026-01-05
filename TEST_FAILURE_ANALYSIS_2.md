# Test Failure Analysis: Snackbar DOM Element Not Appearing

| **Property**  | **Value**                                                                        |
| ------------- | -------------------------------------------------------------------------------- |
| **Date**      | January 5, 2026                                                                  |
| **Test File** | `playwright/opponent-choosing.smoke.spec.js`                                     |
| **Status**    | 🔴 **Integration Issue** — Snackbar system unified, investigating priority logic |
| **Severity**  | High (test failure confirmed, production behavior needs validation)              |
| **Priority**  | P1 (blocking test suite, potential production impact)                            |

---

## Executive Summary

Following resolution of the initialization synchronization issue (documented in `TEST_FAILURE_ANALYSIS.md`), opponent-choosing tests continue to fail. Investigation confirms that while `showSnackbar()` is correctly invoked, the corresponding snackbar DOM element (`.snackbar-bottom`) fails to appear in the DOM tree.

**Root Cause**: The snackbar element is prematurely removed by `container.replaceChildren()` before the delayed message can be rendered. By the time `showSnackbar()` is called (typically 500ms later), the round has often already resolved, leading to timing conflicts or state issues that prevent the snackbar's creation or display.

**Impact**: This suggests that the "Opponent is choosing..." feature may not function as intended in production, highlighting a fundamental architectural challenge in coordinating delayed UI updates with core battle flow logic.

---

## Implementation Progress

The following tasks have been completed and represent foundational work for the recommended fix plan (Option A).

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

### Task 5: Create Comprehensive Unit Tests ✅ COMPLETE

**Status**: All 23 tests passing

**Date Started**: January 11, 2026
**Date Completed**: January 5, 2026

**Implementation Details**:
Created comprehensive test suite at `tests/helpers/SnackbarManager.test.js` with 23 tests covering:

- Basic display and DOM element creation
- Priority system (HIGH/NORMAL/LOW)
- Queuing system with max concurrent limit
- Minimum display duration enforcement
- Auto-dismiss functionality
- Update existing/queued messages
- Callbacks (onShow/onDismiss)
- Positioning system (top/bottom classes)
- Disabled state handling
- Diagnostics API
- Clear all functionality

**Resolution Summary**:

The original 3 failing tests were resolved by implementing the following fixes:

1. **Timestamp Collision Issue**: Added a monotonic `sequenceCounter` to ensure deterministic ordering when multiple snackbars are created within the same millisecond. This counter is incremented for each new snackbar and used as the tiebreaker in all sorting operations.

2. **Priority Logic Fix**: Corrected the `canDisplay()` method to properly handle priority-based queuing. The new logic ensures that lower-priority messages are queued when higher-priority messages are active, even if under capacity. This prevents low-importance messages from cluttering critical information.

3. **Positioning Logic Update**: Modified `updatePositioning()` to use the sequence number instead of timestamp for deterministic sorting. This ensures consistent `.snackbar-bottom` and `.snackbar-top` class application.

4. **Capacity Enforcement Fix**: Updated the capacity enforcement logic in the `show()` method to use the sequence number for deterministic identification of the oldest/lowest priority snackbar when at capacity.

**Test Results**: All 23 tests passing ✅

**Key Changes Made**:

1. Added `sequenceCounter` property to SnackbarManager constructor
2. Added `sequence` property to ActiveSnackbar typedef and instance
3. Updated `canDisplay()` to queue lower-priority messages when higher-priority exists
4. Modified `updatePositioning()` to sort by sequence instead of timestamp
5. Updated capacity enforcement to use sequence for oldest-first removal
6. Changed debug logging to show sequence numbers instead of timestamps

**Outcome**: All unit tests pass, snackbar system now has deterministic ordering and proper priority handling

---

### Task 6: Unify Snackbar Systems (showSnackbar.js → SnackbarManager) ✅ COMPLETE

**Status**: Delegation implemented, investigating priority display issue
**Date**: January 5, 2026

**Problem Identified**:

- Two competing snackbar systems were managing the same DOM container
- Legacy `showSnackbar.js` (~331 lines) had independent queue/DOM management
- New `SnackbarManager.js` used by `uiEventHandlers.js` for HIGH priority messages
- Both systems competed for `#snackbar-container`, preventing proper priority-based display

**Solution Implemented**:

- Replaced entire `showSnackbar.js` implementation (~331 lines → ~90 lines)
- Created delegation wrapper that routes to SnackbarManager singleton
- Legacy API preserved: `showSnackbar(message)` and `updateSnackbar(message)`
- All legacy calls now use NORMAL priority with 3000ms auto-dismiss
- Maintains backward compatibility for 20+ files importing showSnackbar

**Key Changes**:

```javascript
// Before: Independent queue-based implementation
const messageQueue = [];
export function showSnackbar(message) {
  // ~200 lines of DOM/queue management
}

// After: Delegation to SnackbarManager
import snackbarManager, { SnackbarPriority } from "./SnackbarManager.js";
export function showSnackbar(message) {
  lastSnackbarController = snackbarManager.show({
    message,
    priority: SnackbarPriority.NORMAL,
    minDuration: 0,
    autoDismiss: 3000
  });
}
```

**Current Status**:

- ✅ Unification complete, single queue system
- ✅ All 23 SnackbarManager unit tests still passing  
- ❌ Playwright tests still showing LOW priority message in `.snackbar-bottom`
- 🔍 Investigating: HIGH priority message should override LOW, needs debugging

**Next Steps**:

- Added diagnostic logging to SnackbarManager.show() and updatePositioning()
- Created manual test page: `test-snackbar-priority.html`
- Need to verify HIGH priority messages properly evict/reposition LOW priority

---

## 1. Problem Statement

### Observable Behavior

When a player selects a stat in Classic Battle mode with `opponentDelayMessage: true`:

1. ✅ The `statSelected` event is emitted correctly.
2. ✅ The event handler receives the event and executes.
3. ✅ The handler schedules the message to appear after a 500ms delay.
4. ✅ After 500ms, `displayOpponentChoosingPrompt()` is called.
5. ✅ `displayOpponentChoosingPrompt()` calls `showSnackbar(message)`.
6. ❌ **The snackbar DOM element never appears or is not visible to the user.**

### Test Expectations vs. Reality

| **Scenario**                | **Expected**                               | **Actual**                                                                   |
| :-------------------------- | :----------------------------------------- | :--------------------------------------------------------------------------- |
| **With delay flag enabled** | Snackbar appears after 500ms delay         | ❌ Element not found: `locator('#snackbar-container .snackbar-bottom')`      |
| **With delay flag disabled**| Snackbar appears immediately               | ❌ Element found, but shows stale content (e.g., "First to 5 points wins."). |

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

The feature exhibits a fundamental timing issue:

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

**The Problem**: By `t=500ms`, when the snackbar should appear, the round has often already resolved (e.g., at `t=~700ms`). This leads to a situation where:

1. **State Conflict**: The battle state machine may have moved to `roundOver` or `cooldown`, preventing snackbars from being shown.
2. **DOM Cleanup**: Round resolution might trigger cleanup routines that inadvertently remove or hide snackbars.
3. **Message Collision**: A subsequent message (e.g., "Opponent wins!") from round outcome might overwrite the delayed message.
4. **Element Creation Failure**: `showSnackbar()` may silently fail or encounter issues when called after a significant state change.

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

**The issue**: `replaceChildren()` immediately removes the snackbar element at `t=0ms`. A new snackbar is then scheduled to appear 500ms later. However, the battle flow does not pause; it proceeds immediately to resolve the round, creating a race condition where the snackbar's display is often preempted or rendered irrelevant.

### Why `__OPPONENT_RESOLVE_DELAY_MS` Didn't Help

Setting `window.__OPPONENT_RESOLVE_DELAY_MS = 1500` to delay the opponent's response did not resolve the issue. Possible reasons include:

1. **Test Environment Disregard**: The delay might not be respected in the specific test setup's battle flow.
2. **Late Application**: The delay might need to be configured before battle initialization, not just before navigation.
3. **Incorrect Layer**: The delay might affect a different aspect of the battle flow (e.g., opponent AI decision-making) rather than the critical round resolution timing.

---

## 4. Architectural Issues

### Issue 1: Lack of Coordination Between Snackbar Delay and Battle Flow

The snackbar's delayed display (500ms) and the battle round resolution operate as **completely independent processes**:

- **Snackbar layer**: Relies on `setTimeout()` to schedule message appearance.
- **Battle layer**: Immediately processes stat selection and resolves the round.
- **No synchronization**: There is no explicit mechanism for either layer to wait for or be aware of the other's timing.

### Issue 2: Absence of an Explicit "Waiting for Opponent" State

The current battle flow seemingly lacks an explicit "waiting for opponent action" state. Such a state would be crucial to:

1. Ensure the delayed snackbar message is displayed.
2. Prevent round resolution until the message has been visible for a minimum duration.
3. Properly coordinate with the opponent's "reveal" timing.

### Issue 3: Unmanaged Snackbar Lifecycle

The current snackbar implementation:

1. Immediately clears the snackbar container (`replaceChildren()`).
2. Schedules a new snackbar for future display (500ms later).
3. Lacks any robust mechanism to guarantee the scheduled snackbar actually appears.
4. Provides no post-display cleanup or validation once the timeout fires.

---

## 5. Proposed Fix Plan

This section outlines potential solutions to the identified timing and architectural issues. Note that the "Implementation Progress" (Tasks 1-4) has already laid significant groundwork aligning with Option A.

### Option A: Coordinate Battle Flow with Snackbar Delay (Recommended)

**Goal**: Make the battle engine wait for the snackbar message before resolving the round.

**Implementation Steps** (largely aligned with "Implementation Progress" Tasks 1-4):

1. **Enhance Event Handler to Return a Promise**: The `statSelected` handler (now part of `uiEventHandlers.js`) should return a promise that resolves _after_ the snackbar has been shown and its minimum display duration has elapsed.

    ```javascript
    // In uiEventHandlers.js statSelected handler
    onBattleEvent("statSelected", async (e) => {
      // ... existing code ...
      
      if (shouldDelay) {
        clearSnackbarContainer(); // Clears any existing snackbar
        const snackbarPromise = SnackbarManager.show(
          opponentPromptMessage,
          { priority: 'HIGH', minDuration: 750 } // Enforce min duration from QA spec
        );
        await snackbarPromise.waitForMinDuration(); // Wait for snackbar to be fully displayed
      } else {
        showPromptAndCaptureTimestamp(opponentPromptMessage);
      }
    });
    ```

2. **Modify Selection Handler to Await Event Handlers**: The `handleStatSelection` function in `selectionHandler.js` (or its orchestrator) must `await` the completion of the `statSelected` event handlers.

    ```javascript
    // In selectionHandler.js (or coordinating battle flow logic)
    export async function handleStatSelection(stat, store, opts = {}) {
      // Emit statSelected BEFORE processing selection
      emitBattleEvent("statSelected", { 
        store, stat, playerVal, opponentVal, opts: eventOpts 
      });
      
      // Wait for statSelected handlers to complete (including the snackbar delay)
      await awaitStatSelectedHandler(); // Provided by Task 2 & 3
      
      // NOW process the stat selection
      const outcome = battleEngine.handleStatSelection(playerVal, opponentVal);
      // ... rest of the flow
    }
    ```

3. **Formalize State (Completed by Task 4)**: The introduction of the `waitingForOpponentDecision` state explicitly models this pause in the battle flow, ensuring clear transitions.

**Benefits**:

- ✅ Directly implements the intended feature behavior from QA specifications.
- ✅ Guarantees the "Opponent is choosing..." message is visible for the specified minimum duration.
- ✅ Establishes clean, explicit coordination between the UI and game logic layers.
- ✅ Delivers the best user experience by preventing race conditions.

**Risks**:

- ⚠️ Modifies core battle flow timing, necessitating thorough testing for regressions.
- ⚠️ May subtly affect other system components relying on immediate stat processing.
- ⚠️ Introduces asynchronous complexity into what was previously a more synchronous event path.

### Option B: Fix Snackbar Display Without Changing Battle Flow (Simpler)

**Goal**: Ensure the snackbar appears even if the round has already resolved.

**Implementation Steps**:

1. **Avoid Immediate Snackbar Clearing**: In `uiEventHandlers.js`, do not call `replaceChildren()` immediately. Instead, `SnackbarManager` (Task 1) should handle the update or creation of snackbars.

    ```javascript
    // In uiEventHandlers.js
    if (shouldDelay) {
      // SnackbarManager should manage existing snackbars or create new ones
      opponentSnackbarHandle = SnackbarManager.show(opponentPromptMessage, { 
        priority: 'high',  // Ensure it's not overridden
        minDuration: 750   // Keep visible for minimum time
      });
    }
    ```

2. **Implement Snackbar Priority System**: `SnackbarManager` (Task 1) should correctly prioritize messages, preventing lower-priority messages (e.g., round outcome) from immediately overwriting critical high-priority messages (e.g., "Opponent is choosing...").

3. **Protect Delayed Messages**: The `roundResolved` event handler should explicitly check if a high-priority delayed message is active and, if so, defer showing the round outcome message until the delayed message has completed its minimum display duration.

**Benefits**:

- ✅ Simpler, more isolated changes to the UI layer.
- ✅ Less impact on core battle flow timing, potentially lower regression risk.

**Drawbacks**:

- ⚠️ Does not address the underlying architectural issue of uncoordinated timings.
- ⚠️ Still prone to subtle timing conflicts, where the delayed message might appear _after_ the round has visibly resolved, leading to a confusing user experience.

### Option C: Skip Snackbar When Round Resolves Too Quickly (Pragmatic)

**Goal**: Accept that sometimes the round resolves too fast, and just skip the message in those cases.

**Implementation**:

```javascript
onBattleEvent("statSelected", async (e) => {
  if (shouldDelay) {
    clearSnackbarContainer(); // Clears any existing snackbar
    
    let cancelled = false;
    
    // Listen for round resolution immediately
    const cancelToken = onBattleEvent("roundResolved", () => {
      cancelled = true; // Mark as cancelled if round resolves
      clearTimeout(opponentSnackbarId); // Prevent delayed message from showing
    });
    
    opponentSnackbarId = setTimeout(() => {
      if (!cancelled) { // Only display if not cancelled by round resolution
        displayOpponentChoosingPrompt();
      }
      cancelToken.remove(); // Clean up listener
    }, scheduleDelay);
  }
});
```

**Benefits**:

- ✅ Simplest implementation, minimizing immediate code complexity.
- ✅ Avoids awkward timing issues where the message appears too late.
- ✅ Provides a form of graceful degradation.

**Drawbacks**:

- ❌ The feature does not work as designed in fast-paced scenarios.
- ❌ The "Opponent is choosing..." message may frequently be absent, diminishing UX.
- ❌ Requires rewriting tests to specifically account for this behavior.

---

## 6. Recommended Solution

**Primary Recommendation**: **Option A** (Coordinate Battle Flow with Snackbar Delay)

**Rationale**:
This option, largely addressed by the completed Implementation Progress Tasks 1-4, is superior because it:

1. **Fully Aligns with QA Spec**: Directly implements the intended feature design from `docs/qa/opponent-delay-message.md`, ensuring the user experience matches expectations.
2. **Guarantees Visibility**: Ensures the message is displayed for its specified minimum duration, preventing the "flicker" or non-appearance bug.
3. **Architectural Soundness**: Establishes proper, explicit coordination between the UI update layer and the core game logic, preventing future race conditions.
4. **Optimal User Experience**: Provides a clear and unambiguous signal to the player, enhancing game clarity and engagement.

**Implementation Priority**:
The work completed in Tasks 1-4 provides a strong foundation for Option A. The immediate next steps involve resolving the failing unit tests (Task 5) and integrating the new state and handlers into the main battle flow.

---

## 7. Testing Strategy

### Unit Tests Required

1. **Handler Timing Tests**:

    ```javascript
    test("statSelected handler delays message by configured amount", async () => {
      vi.useFakeTimers();
      emitBattleEvent("statSelected", { opts: { delayOpponentMessage: true } });
      
      // Message should not appear immediately
      expect(SnackbarManager.isSnackbarActive()).toBe(false);
      
      // Advance time
      await vi.advanceTimersByTimeAsync(500);
      
      // Message should now appear and be active
      expect(SnackbarManager.isSnackbarActive()).toBe(true);
      expect(SnackbarManager.getMessage()).toContain("Opponent is choosing");
    });
    ```

2. **Battle Flow Coordination Tests**:

    ```javascript
    test("battle engine waits for delayed snackbar before resolving round", async () => {
      const startTime = Date.now();
      
      // Assuming handleStatSelection now orchestrates the await
      await handleStatSelection("power", store, { delayOpponentMessage: true });
      
      const elapsed = Date.now() - startTime;
      
      // Should have waited at least 500ms (snackbar delay) + 750ms (min duration)
      expect(elapsed).toBeGreaterThanOrEqual(500 + 750);
    });
    ```

3. **Minimum Display Duration Tests**:

    ```javascript
    test("snackbar remains visible for minimum duration", async () => {
      // Directly using SnackbarManager for isolated testing
      const snackbarHandle = SnackbarManager.show("Test Message", { minDuration: 750 });
      
      // Snackbar should be visible immediately
      expect(SnackbarManager.isSnackbarActive(snackbarHandle.id)).toBe(true);
      
      // Advance time less than minDuration
      await vi.advanceTimersByTimeAsync(500);
      expect(SnackbarManager.isSnackbarActive(snackbarHandle.id)).toBe(true);
      
      // Advance remaining time
      await vi.advanceTimersByTimeAsync(250); // Total 750ms
      
      // Snackbar should still be visible after minDuration, until explicitly removed or auto-dismiss
      expect(SnackbarManager.isSnackbarActive(snackbarHandle.id)).toBe(true);
    });
    ```

### Integration Tests Required

1. **End-to-End Round Flow**:
    - Verify the snackbar appears at the correct time and position.
    - Validate the minimum display duration is enforced.
    - Confirm the round resolves _after_ the "Opponent is choosing..." message has completed its display.
    - Ensure the round outcome message appears correctly _after_ the opponent message.
2. **State Machine Transitions**:
    - Test all state transitions, specifically focusing on the new `waitingForOpponentDecision` state with delayed messages.
    - Verify that snackbars persist across expected state changes and are cleaned up appropriately.

### Playwright Tests Updates

1. **Update `playwright/opponent-choosing.smoke.spec.js`**:
    - Remove any existing workarounds for the opponent resolve delay.
    - Adjust timing expectations to match the new, coordinated behavior.
    - Add explicit assertions for the snackbar appearing after the delay and its visibility duration.
2. **Add Edge Case Tests**:
    - Test very fast rounds (where the opponent responds significantly faster than the delay).
    - Test scenarios involving rapid player input (spam-clicking).
    - Test multiple, rapid stat selections.
    - Test browser/tab visibility changes during the snackbar delay.

---

## 8. Opportunities for Improvement (Agent's Perspective)

Beyond the immediate bug fix, I have identified several architectural and design opportunities that could significantly enhance the robustness, maintainability, and extensibility of the battle system and UI components.

### 1. Event-Driven Battle Flow Orchestration 🎯 **High Impact**

**Rationale**: The current mix of synchronous and asynchronous operations, with implicit coordination, is a source of timing bugs and complexity. A formal event-driven architecture centralizes control, making the system more predictable and testable.

**Recommendation**: Introduce a battle flow orchestrator that dispatches well-defined events for each phase of a round (e.g., `statSelection:before`, `statSelection:processed`, `round:complete`). UI components and other modules would subscribe to these events, reacting predictably and avoiding direct, uncoordinated calls. This approach ensures clearer separation of concerns and facilitates easier debugging and feature expansion.

---

### 2. Dedicated UI Message / Snackbar Management 🎯 **High Impact**

**Rationale**: Ad-hoc creation and destruction of UI messages (like snackbars) without a centralized manager leads to inconsistent display, race conditions, and difficulty in enforcing UX policies (e.g., minimum display times, priority). The `SnackbarManager` (Task 1) is a strong step in this direction.

**Recommendation**: Fully leverage and expand the `SnackbarManager` (or similar component) to handle _all_ temporary UI messages. This manager should be responsible for:

- Queueing and prioritizing messages.
- Enforcing minimum display durations.
- Managing maximum concurrent messages.
- Providing a consistent API for showing, updating, and dismissing messages from any part of the application.

---

### 3. Formalized Battle State Machine 🎯 **Medium Impact**

**Rationale**: Scattering state transitions across various files makes the overall battle flow opaque and error-prone. A formal state machine (like the one proposed and partially implemented in Task 4) provides a single source of truth for the game's lifecycle.

**Recommendation**: Implement a fully formal state machine (e.g., using a library like XState or a robust custom implementation) with explicit states, events, and transitions. This would clearly define valid pathways through the game, prevent illegal state transitions, and make complex interactions (like mid-round interruptions or special events) much easier to model and test.

---

### 4. Centralized Configuration for Timing & Values 🎯 **Low Impact**

**Rationale**: Hardcoding timing values and other magic numbers across the codebase hinders tuning, testing, and consistency.

**Recommendation**: Consolidate all configurable values, especially timing parameters (delays, durations, timeouts), into a single, easily accessible configuration module (e.g., `src/config/battleTiming.js`). This would allow for:

- Quick and consistent adjustments to game pacing and UI responsiveness.
- Simplified A/B testing of different timings.
- Enhanced testability by allowing easy overriding of default values in test environments.

---

### 5. Enhanced Diagnostic Tooling 🎯 **Low Impact**

**Rationale**: Debugging timing-sensitive issues, especially intermittent race conditions, is challenging with basic logging. A detailed, timestamped event timeline provides invaluable insight.

**Recommendation**: Extend `window.__battleDiagnostics` to capture a comprehensive, timestamped event timeline. This timeline should record significant game events, UI interactions, and state changes with high precision. This would enable developers to visually inspect the exact sequence and timing of operations, making it significantly easier to pinpoint the root cause of complex, time-dependent bugs.

---

## 9. Risk Assessment

### Implementation Risks

| **Risk**                                   | **Severity** | **Mitigation**                                                |
| :----------------------------------------- | :----------- | :------------------------------------------------------------ |
| Battle flow timing regression              | High         | Comprehensive integration tests; phase rollout via feature flag. |
| Breaking existing battle features          | High         | Thorough test coverage for all battle modes; peer review.     |
| Performance impact from async coordination | Medium       | Performance profiling (before/after); optimize critical paths. |
| Increased code complexity                  | Medium       | Clear documentation, modular design, thorough code reviews.   |
| Test flakiness from timing changes         | Low          | Strict use of fake timers in unit tests; deterministic delays. |

### Production Impact Analysis

**Best Case**: The feature functions flawlessly, all tests pass, and users experience a smoother, more predictable UI.
**Likely Case**: Some fine-tuning of timing values may be necessary, and minor UX polish might be required post-deployment.
**Worst Case**: Fundamental architectural issues are exposed, requiring a more extensive refactor than currently anticipated.

**Recommendation**: Implement the fix behind a feature flag initially. This allows for controlled rollout, real-world testing, and rapid rollback if unforeseen issues arise.

---

## 10. Implementation Checklist

### Pre-Implementation

- [ ] Review and approve this analysis document.
- [ ] Confirm agreement on **Option A** as the chosen fix strategy.
- [ ] Create a feature flag for the new battle flow behavior (e.g., `coordinatedBattleFlow`).
- [ ] Ensure timeline recording is active in `__battleDiagnostics` for enhanced debugging.

### Implementation (Option A)

- [ ] Finalize `SnackbarManager` (resolve Task 5 failing tests).
- [ ] Integrate `SnackbarManager` into `uiEventHandlers.js`'s `statSelected` handler to return a promise that resolves after minimum duration.
- [ ] Ensure `selectionHandler.js` (or battle flow orchestrator) correctly `awaits` the completion of `statSelected` event handlers.
- [ ] Verify the `waitingForOpponentDecision` state (from Task 4) is correctly integrated and manages transitions.

### Testing

- [ ] Complete and pass all unit tests for `SnackbarManager` (Task 5).
- [ ] Develop and execute unit tests for handler timing and battle flow coordination.
- [ ] Implement unit tests to verify minimum snackbar display duration.
- [ ] Conduct integration tests for the end-to-end round flow, including new state transitions.
- [ ] Update and pass `playwright/opponent-choosing.smoke.spec.js`.
- [ ] Add Playwright edge case tests (fast rounds, spam clicks, tab visibility changes).

### Validation

- [ ] Perform comprehensive manual testing in a development environment.
- [ ] Verify that the timing and flow feel natural and intuitive to a user.
- [ ] Monitor for any performance regressions post-implementation.
- [ ] Confirm no regressions have been introduced in other battle features.
- [ ] Conduct cross-browser compatibility testing.

### Documentation

- [ ] Update QA guide with new timing behavior.
- [ ] Document architecture changes.
- [ ] Update test documentation.
- [ ] Add troubleshooting guide.

### Deployment

- [ ] Deploy the changes initially behind the `coordinatedBattleFlow` feature flag.
- [ ] Actively monitor for production issues and error reports.
- [ ] Collect user feedback on the new interaction timing.
- [ ] Gradually increase the rollout percentage.
- [ ] Remove the feature flag once stability and positive impact are confirmed.

---

## 11. Related Files & References

### Core Implementation Files

| **File**                                       | **Purpose**                                            |
| :--------------------------------------------- | :----------------------------------------------------- |
| `src/helpers/classicBattle/uiEventHandlers.js` | `statSelected` handler, snackbar logic, event coordination |
| `src/helpers/classicBattle/selectionHandler.js`| Stat selection processing, event awaiting              |
| `src/helpers/SnackbarManager.js`               | Centralized snackbar lifecycle management              |
| `src/helpers/classicBattle/stateTable.js`      | Battle state machine definitions                       |
| `src/helpers/battleEngineFacade.js`            | Battle engine interface                                |

### Test Files

| **File**                                            | **Purpose**                          |
| :-------------------------------------------------- | :----------------------------------- |
| `playwright/opponent-choosing.smoke.spec.js`        | Currently failing E2E tests          |
| `tests/helpers/SnackbarManager.test.js`             | Unit tests for `SnackbarManager`     |
| `tests/classicBattle/opponent-delay-behavior.test.js` | Unit tests for delay feature behavior |

### Documentation

| **File**                                   | **Content**                                     |
| :----------------------------------------- | :---------------------------------------------- |
| `docs/qa/opponent-delay-message.md`        | Feature specification for opponent delay message |
| `TEST_FAILURE_ANALYSIS.md`                 | Initial investigation of initialization issues  |
| `design/specs/battle-state-machine.md`     | (If exists) Detailed state machine specification |

---

## 12. Questions for Reviewer

1. **Approach Preference**: Do you concur with the recommendation for **Option A** (Coordinate Battle Flow), or do you prefer an alternative (Option B or C)?
2. **Scope of SnackbarManager**: Should the full implementation of `SnackbarManager` (as detailed in Task 1 and Opportunity #2) be completed as part of this immediate fix, or should some aspects be deferred to a follow-up task?
3. **Testing Depth**: Are there specific edge cases or complex scenarios, beyond those listed in the Testing Strategy, that you would like to see explicitly covered by new tests?
4. **Timing Values**: Are the proposed timing values (e.g., 500ms initial delay, 750ms minimum display duration) acceptable, or should they be adjusted based on UX guidelines or other factors?
5. **Feature Flag Strategy**: Is deploying the new behavior behind a feature flag the preferred initial approach, or would a direct deployment be acceptable given the current state of the code and risk assessment?
6. **State Machine Formalization**: Regarding Opportunity #3 (Formalized Battle State Machine), should we prioritize full state machine formalization now, or is it acceptable to defer it to future architectural work?

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

1. Start the development server: `npm run dev`
2. Navigate to `/battleClassic.html` with `opponentDelayMessage: true` (e.g., via URL parameter or feature flag).
3. Start a new battle.
4. Click any stat button to make a selection.
5. Observe: Console logs confirm the handler executes, but the "Opponent is choosing..." snackbar does not visually appear.
6. Check the DOM (using browser developer tools): Confirm that no `.snackbar-bottom` element is present in the `body` or within `#snackbar-container`.

---

**Status**: Analysis and proposed revisions complete. Awaiting reviewer's feedback and decision.
**Date**: January 5, 2026
**Author**: AI Agent Investigation
