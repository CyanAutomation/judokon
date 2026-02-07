# State Flags Lifecycle Documentation

**Purpose**: Document the lifecycle of boolean flags used in the JU-DO-KON classic battle state machine to prevent race conditions and ensure proper state management.

**Last Updated**: January 2, 2026

---

## Overview

The classic battle system uses multiple boolean flags to track selection state, button readiness, and round progression. Understanding their lifecycle is critical for preventing race conditions and maintaining state consistency.

## Core Selection Flags

### `store.selectionMade`

**Type**: Store property (in-memory)  
**Purpose**: Tracks whether the player has made a stat selection in the current round  
**Scope**: Single round lifecycle

#### Lifecycle Phases

**Initialization**:

- Set to `false` in `startRound()` ([roundManager.js](../src/helpers/classicBattle/roundManager.js))
- Set to `false` on `roundSelect` entry ([roundSelectEnter.js](../src/helpers/classicBattle/stateHandlers/roundSelectEnter.js))

**Set to `true`**:

- When player selects a stat ([selectionHandler.js](../src/helpers/classicBattle/selectionHandler.js))
- During normal stat selection flow

**Set to `false` (Reset)**:

- At round start ([roundManager.js](../src/helpers/classicBattle/roundManager.js))
- When entering `roundSelect` ([roundSelectEnter.js](../src/helpers/classicBattle/stateHandlers/roundSelectEnter.js))
- During round interruption cleanup ([interruptStateCleanup.js](../src/helpers/classicBattle/stateHandlers/interruptStateCleanup.js))
- When interrupt cleanup runs ([interruptRoundEnter.js](../src/helpers/classicBattle/stateHandlers/interruptRoundEnter.js))

**Read/Checked**:

- Test diagnostics ([testApi.js:2586, 2844](../src/helpers/testApi.js))
- Battle state checks ([roundManager.js:804](../src/helpers/classicBattle/roundManager.js#L804))
- Store validation ([settingsPage.js:52](../src/helpers/settingsPage.js#L52))

#### Ownership Contract

| State            | Owner             | Expected Value            | Transition Responsibility       |
| ---------------- | ----------------- | ------------------------- | ------------------------------- |
| `roundSelect`    | State handler     | `false` (reset on entry)  | Handler sets to `false`         |
| `roundResolve`   | Selection handler | `true` (after selection)  | User interaction sets to `true` |
| `roundDisplay`   | Round manager     | Preserved for diagnostics | Not modified                    |
| `roundWait`      | Round manager     | Preserved for diagnostics | Not modified                    |
| `interruptRound` | Cleanup utility   | `false` (cleanup)         | Cleanup sets to `false`         |

#### Common Issues

⚠️ **Race Condition Risk**: Setting `selectionMade` to `true` after a state transition can cause the flag to persist into the next round if not properly reset.

**Solution**: Always reset on `roundSelect` entry (see [opponent-reveal.spec.js fix](./status/archive/TEST_INVESTIGATION_SUMMARY.md#6-opponent-revealspecjs---resets-stat-selection-after-advancing-to-the-next-round-)).

---

### `window.__classicBattleSelectionFinalized`

**Type**: Window global (diagnostic/test support)  
**Purpose**: Tracks whether the Next button has been finalized (enabled and ready for interaction)  
**Scope**: Test observability and button state coordination

⚠️ **Note**: This flag mirrors `store.selectionMade` for test observability. Treat `store.selectionMade` as the single source of truth and use the unified helpers in [selectionState.js](../src/helpers/classicBattle/selectionState.js).

#### Lifecycle Phases

**Initialization**:

- Set to `false` in timer reset ([timerService.js](../src/helpers/classicBattle/timerService.js))
- Set to `false` in `startRound()` ([roundManager.js](../src/helpers/classicBattle/roundManager.js))
- Set to `false` on `roundSelect` entry ([roundSelectEnter.js](../src/helpers/classicBattle/stateHandlers/roundSelectEnter.js))

**Set to `true`**:

- When Next button is finalized (advance context) ([uiHelpers.js](../src/helpers/classicBattle/uiHelpers.js))
- During early button finalization in round wait ([roundWaitEnter.js](../src/helpers/classicBattle/stateHandlers/roundWaitEnter.js))

**Set to `false` (Reset)**:

- Timer reset ([timerService.js](../src/helpers/classicBattle/timerService.js))
- Round start ([roundManager.js](../src/helpers/classicBattle/roundManager.js))
- State entry to `roundSelect` ([roundSelectEnter.js](../src/helpers/classicBattle/stateHandlers/roundSelectEnter.js))
- Cleanup utility ([interruptStateCleanup.js](../src/helpers/classicBattle/stateHandlers/interruptStateCleanup.js))

**Read/Checked**:

- Test diagnostics ([testApi.js:2580, 2840](../src/helpers/testApi.js))
- Playwright helpers ([testApiHelpers.js:76](../playwright/helpers/testApiHelpers.js#L76))

#### Companion Flag

`window.__classicBattleLastFinalizeContext` tracks the context string ("advance", etc.) for why the button was finalized.

---

## Other Boolean Flags

### `store.roundReadyForInput`

**Type**: Store property  
**Purpose**: Controls when stat buttons can accept user input  
**Set to `true`**: Selection enabled ([roundSelectEnter.js](../src/helpers/classicBattle/stateHandlers/roundSelectEnter.js), [roundUI.js](../src/helpers/classicBattle/roundUI.js))  
**Set to `false`**: Selection disabled ([roundUI.js](../src/helpers/classicBattle/roundUI.js))

### `store.matchEnded`

**Type**: Store property  
**Purpose**: Indicates match completion  
**Set**: `setupScoreboard()` ([setupScoreboard.js:236](../src/helpers/setupScoreboard.js))  
**Read**: Score checking ([setupScoreboard.js:284](../src/helpers/setupScoreboard.js))

### `container.dataset.selectionInProgress`

**Type**: DOM dataset attribute  
**Purpose**: Prevents concurrent selection handling (guard flag)  
**Set to `"true"`**: Selection active ([roundManager.js](../src/helpers/classicBattle/roundManager.js))  
**Set to `"false"`**: Selection complete or reset ([roundSelectEnter.js](../src/helpers/classicBattle/stateHandlers/roundSelectEnter.js))  
**Read**: Guard check ([roundManager.js](../src/helpers/classicBattle/roundManager.js))

---

## State Machine Guard Patterns

As of January 2, 2026, state guards have been added to async handlers to prevent race conditions:

### Pattern: Verify State After Async Operations

```javascript
// Example from roundWaitEnter.js
await startCooldown(store, scheduler, controls);

// Verify state hasn't regressed after async operation
const currentState = machine.getState ? machine.getState() : null;
const validStates = ["roundWait", "roundPrompt"]; // Allow normal progression
if (currentState && !validStates.includes(currentState)) {
  debugLog("State changed unexpectedly during async operation", {
    expected: validStates,
    actual: currentState
  });
  return; // Exit gracefully, don't modify state
}

// Safe to proceed with state modifications
guard(() => {
  updateRoundStateAtomically(roundStore.getCurrentRound());
});
```

### Handlers with State Guards (as of Jan 2, 2026)

✅ **Protected Handlers**:

- `roundPromptEnter.js` - Checks state before dispatching `cardsRevealed`
- `roundWaitEnter.js` - Verifies state after `startCooldown` (allows roundWait → roundPrompt)
- `roundSelectEnter.js` - Verifies state after `startTimer` (allows progression to roundResolve)
- `roundDisplayEnter.js` - Verifies state after outcome confirmation (allows progression to roundWait/matchDecision)
- `roundResolveEnter.js` - Comprehensive guards via `guardSelectionResolution`

❌ **Unprotected Handlers** (fire-and-forget or no async operations):

- `matchStartEnter.js` - Intentionally fire-and-forget to avoid deadlock
- `matchDecisionEnter.js` - No async operations (showEndModal is sync)
- `interruptRoundEnter.js` - Dispatches are awaited (no race condition risk)

---

## Best Practices

### 1. Always Reset Flags on State Entry

When entering a state that expects clean selection state, explicitly reset the flag:

```javascript
export async function roundSelectEnter(machine) {
  const store = machine?.context?.store;
  if (store) {
    store.selectionMade = false; // ✅ Explicit reset
    store.playerChoice = null;
  }
  // ... rest of handler
}
```

### 2. Use State Guards for Async Operations

When performing async operations that modify state, verify the state machine hasn't transitioned:

```javascript
await someAsyncOperation();

// ✅ Verify state before modifying
const currentState = machine.getState ? machine.getState() : null;
const validStates = ["expectedState", "allowedProgression"];
if (currentState && !validStates.includes(currentState)) {
  return; // Exit gracefully
}

// Safe to modify state
```

### 3. Document Flag Ownership

When adding new flags, document:

- **Initialization point**: Where the flag is first set
- **Transition conditions**: What events cause the flag to change
- **Reset responsibility**: Which handler/utility owns cleanup
- **Race condition risks**: Potential timing issues

### 4. Avoid Dual Flags for Same Purpose

Use a single source of truth. If you need both store-based and window-based flags, document the migration path to unification.

---

## Migration Notes

### Unifying `selectionMade` and `__classicBattleSelectionFinalized`

**Status**: Completed (store is source of truth, window mirror retained for tests)  
**Goal**: Use `store.selectionMade` as single source of truth  
**Strategy (current)**:

1. Use `selectionState.js` helpers to read/write selection status
2. Mirror to `window.__classicBattleSelectionFinalized` for test observability only
3. Prefer store-derived diagnostics in application code

---

## Debugging Tips

### Tracing Flag Changes

Use the `logSelectionMutation` helper to track flag changes:

```javascript
import { logSelectionMutation } from "../selectionHandler.js";

store.selectionMade = false;
logSelectionMutation("myHandler.reset", store);
```

### Diagnostic Snapshot

Use the test API to get a comprehensive state snapshot:

```javascript
const snapshot = await page.evaluate(() => {
  return window.__testApi?.getBattleSnapshot?.();
});

console.log("selectionMade:", snapshot.selectionMade);
console.log("selectionFinalized:", snapshot.selectionFinalized);
```

---

## Related Documentation

- [TEST_INVESTIGATION_SUMMARY.md](./status/archive/TEST_INVESTIGATION_SUMMARY.md) - Recent race condition fixes
- [initialization-sequence.md](initialization-sequence.md) - Battle initialization phases
- [AGENTS.md](../AGENTS.md) - Agent development guidelines
- [prdStateHandler.md](../design/productRequirementsDocuments/prdStateHandler.md) - State handler specifications

---

**Version**: 1.0.0  
**Status**: Active - updated with state guard patterns (Jan 2, 2026)
