# Round State Management Centralization - Design Document

## Current State Analysis

### Existing Round State Management

**Round Number Tracking:**

- Primary source: `battleEngineFacade.getRoundsPlayed()`
- Event propagation: `"display.round.start"` events with `roundNumber` detail
- UI updates: `scoreboardAdapter.js` listens for round start events

**Round State Machine:**

- States: `waitingForMatchStart`, `matchStart`, `cooldown`, `roundStart`, `waitingForPlayerAction`, `roundDecision`, `roundOver`, `matchDecision`, `matchOver`, `interruptRound`, `interruptMatch`, `roundModification`
- Transitions logged via `battleDebug.logStateTransition(from, to, event)`
- State snapshots via `battleDebug.getStateSnapshot()`

**Ready Dispatch Tracking:**

- Module-level flag in `roundReadyState.js`
- Tracks whether "ready" event dispatched for current cooldown
- Reset on new cooldown cycles

### Problems Identified

1. **Scattered State**: Round data distributed across battle engine, debug modules, and event handlers
2. **No Single Source of Truth**: Round number read from engine, state from debug module, ready state from separate module
3. **Event-Driven Updates**: UI components react to events rather than subscribing to state changes
4. **Testing Complexity**: Multiple modules to mock for round state testing
5. **Race Conditions**: Potential timing issues between engine updates and UI reactions

## Proposed RoundStore API

### Core Interface

```javascript
// Observable store for round state
class RoundStore {
  // Current round data
  getCurrentRound() // { number, state, startTime, selectedStat, outcome }

  // State management
  setRoundState(state)
  setRoundNumber(number)
  setSelectedStat(stat)
  setRoundOutcome(outcome)

  // Event subscription
  onRoundStateChange(callback) // (newState, oldState) => void
  onRoundNumberChange(callback) // (newNumber, oldNumber) => void
  onStatSelected(callback) // (stat) => void
  onRoundOutcome(callback) // (outcome) => void

  // Ready dispatch tracking
  isReadyDispatched()
  markReadyDispatched()
  resetReadyDispatch()

  // Debug/testing
  getStateSnapshot()
  reset()
}
```

### Integration Points

**Battle Engine Bridge:**

```javascript
// Read round number from engine, write to store
const roundNumber = battleEngine.getRoundsPlayed();
roundStore.setRoundNumber(roundNumber);
```

**State Machine Integration:**

```javascript
// Update store on state transitions
stateManager.onTransition((from, to, event) => {
  roundStore.setRoundState(to);
  battleDebug.logStateTransition(from, to, event);
});
```

**UI Components:**

```javascript
// Subscribe to store changes instead of events
roundStore.onRoundNumberChange((number) => {
  scoreboard.updateRoundCounter(number);
});
```

### Migration Strategy

**Phase 1 - Feature Flag Implementation:**

- Add RoundStore behind feature flag
- Wire existing code to write to store
- Keep existing event system as primary

**Phase 2 - Gradual Migration:**

- Migrate high-confidence consumers to read from store
- Maintain event system for compatibility
- Add store validation against events

**Phase 3 - Deprecation:**

- Remove legacy event listeners
- Make store the single source of truth
- Clean up compatibility layers

### Benefits

1. **Centralized State**: Single source of truth for all round-related data
2. **Reactive UI**: Components subscribe to state changes instead of events
3. **Simplified Testing**: Mock store instead of multiple modules
4. **Better Debugging**: Rich state snapshots and transition history
5. **Race Condition Prevention**: Synchronous state updates with async event emission

### Compatibility Layer

```javascript
// Maintain existing event API during migration
roundStore.onRoundNumberChange((number) => {
  emitBattleEvent("display.round.start", { roundNumber: number });
});
```

## Implementation Plan

### Phase 0 - Prototype & Design (Current)

- [x] Analyze current state management
- [x] Design RoundStore API
- [ ] Create prototype implementation
- [ ] Define migration compatibility layer
- [ ] Create integration test examples

### Phase 1 - Feature Flag Implementation

- [ ] Add RoundStore module with feature flag
- [ ] Wire battle engine to update store
- [ ] Wire state machine to update store
- [ ] Maintain existing event system

### Phase 2 - Consumer Migration

- [ ] Migrate scoreboard adapter to read from store
- [ ] Migrate UI components to subscribe to store
- [ ] Add store validation tests
- [ ] Maintain backward compatibility

### Phase 3 - Cleanup

- [ ] Remove legacy event listeners
- [ ] Make store the authoritative source
- [ ] Remove feature flag and compatibility code</content>
      <parameter name="filePath">/workspaces/judokon/design/roundStore/roundStoreDesign.md
