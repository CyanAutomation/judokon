# Battle Store Investigation - Complete Index

## Quick Reference

### Store Object Questions Answered

| Question | Answer | Evidence |
|----------|--------|----------|
| Where is `createBattleStore()` defined? | `src/helpers/classicBattle/roundManager.js:105` | Function returns plain object |
| What does it return? | Plain object with ~13 properties | No freezing, sealing, or descriptors on regular props |
| Where is the store cached/stored? | `window.battleStore` in `battleClassic.init.js:1777` | Set once at init, reused throughout |
| Are there freezing operations? | ❌ NO | Search found 0 `Object.freeze()` calls |
| Are there sealing operations? | ❌ NO | Search found 0 `Object.seal()` calls |
| Are there property descriptors on regular props? | ❌ NO | Descriptors only on guard symbols |
| How does `getBattleStore()` work? | Returns direct reference via 3 fallback paths | All paths return `window.battleStore` |
| Does the store get cloned? | ❌ NO (only read snapshot for debug) | Debug panel creates shallow snapshot only |
| Where does `selectionMade` get set to `true`? | `src/helpers/classicBattle/selectionHandler.js:321` | Direct assignment: `store.selectionMade = true` |
| Where does `playerChoice` get set? | `src/helpers/classicBattle/selectionHandler.js:323` | Direct assignment: `store.playerChoice = stat` |
| Are mutations verified? | ✅ YES | Verification throws error if mutation fails |
| Is there custom getter/setter logic? | ❌ NO | All access is direct property access |

---

## File Cross-Reference

### Store Creation
- **Definition**: `src/helpers/classicBattle/roundManager.js:105-124`
- **Function**: `createBattleStore()`
- **Returns**: Plain object with 13 properties

### Store Initialization & Exposure
- **Init File**: `src/pages/battleClassic.init.js:1777`
- **Exposure**: `window.battleStore = store`
- **Guard Reset**: `exposeTestAPI()` at line 1748

### Store Access in Tests
- **Test Accessor**: `tests/utils/battleStoreAccess.js`
- **Function**: `getBattleStore()`
- **Fallback Chain**: 
  1. `window.__TEST_API.inspect.getBattleStore()`
  2. `window.__classicbattledebugapi.battleStore`
  3. `window.battleStore`

### Mutations to Store
- **Primary**: `src/helpers/classicBattle/selectionHandler.js:310-360`
- **Function**: `applySelectionToStore(store, stat, playerVal, opponentVal)`
- **Mutations**:
  - Line 321: `store.selectionMade = true`
  - Line 323: `store.playerChoice = stat`
- **Verification**: Lines 324-345 (in VITEST only)

### State Reset
- **Files**: 
  - `src/helpers/classicBattle/stateHandlers/waitingForPlayerActionEnter.js:43-45`
  - `src/helpers/classicBattle/controller.js:105`
  - `src/helpers/classicBattle/roundManager.js:272, 308, 1218`
- **Operations**: Reset `selectionMade` and `playerChoice` on state transitions

### Guard Tokens (NOT regular properties)
- **Guard File**: `src/helpers/classicBattle/storeGuard.js:25-99`
- **Symbols Used**:
  - `ROUND_RESOLUTION_GUARD` (Symbol.for)
  - `ROUND_START_GUARD` (Symbol.for)
  - `SELECTION_IN_FLIGHT_GUARD` (Symbol.for)
- **Implementation**: `Object.defineProperty()` with non-enumerable flag

### Selection Flow
- **Test Entry**: `src/helpers/classicBattle/uiHelpers.js:742` (`selectStat`)
- **Handler**: `src/helpers/classicBattle/selectionHandler.js:947` (`handleStatSelection`)
- **Validator**: `src/helpers/classicBattle/selectionHandler.js:564` (`validateAndApplySelection`)
- **Mutation**: `src/helpers/classicBattle/selectionHandler.js:310` (`applySelectionToStore`)

### Debug & Inspection
- **Debug Panel**: `src/helpers/classicBattle/debugPanel.js:226`
- **Store Snapshot**: `getStoreSnapshot(win)` - READ ONLY
- **Test API**: `src/helpers/testApi.js:2361` - `getBattleStore()`

---

## Data Flow Diagrams

### Store Creation to Test Access

```
┌─────────────────────────────────────┐
│ battleClassic.init.js:1777          │
│ const store = createBattleStore()   │
│ window.battleStore = store          │
└─────────────────┬───────────────────┘
                  │
                  │ (stores reference)
                  ▼
        ┌─────────────────────┐
        │ window.battleStore  │ ◄─── Direct reference
        │ (Plain Object)      │
        └─────────────────────┘
                  │
        ┌─────────┴──────────────────────────┐
        │                                    │
        ▼                                    ▼
┌─────────────────────────┐    ┌──────────────────────┐
│ testApi.js:2361         │    │ battleStoreAccess.js │
│ getBattleStore() {      │    │ getBattleStore() {   │
│  return                 │    │  // 3 fallback paths │
│  window.battleStore     │    │  // all return same  │
│ }                       │    │ }                    │
└─────────────────────────┘    └──────────────────────┘
        │                                    │
        └─────────────────┬──────────────────┘
                          │
                          ▼
            ┌─────────────────────────────┐
            │ Test receives same store    │
            │ reference from all paths    │
            └─────────────────────────────┘
```

### Mutation Chain

```
Test Code
│
├─ store = getBattleStore()               ◄─── Step 1: Get reference
│
├─ await selectStat(store, 'power')       ◄─── Step 2: Call with reference
│  │
│  └─ handleStatSelection(store, stat, opts)
│     │
│     └─ validateAndApplySelection(store, stat, playerVal, opponentVal)
│        │
│        └─ applySelectionToStore(store, stat, playerVal, opponentVal)
│           │
│           ├─ store.selectionMade = true  ◄─── Step 3A: MUTATION
│           │
│           ├─ store.playerChoice = stat   ◄─── Step 3B: MUTATION
│           │
│           └─ if (VITEST) {
│              └─ Verify mutations worked  ◄─── Step 3C: VERIFICATION
│              }
│
├─ store = getBattleStore()               ◄─── Step 4: Get fresh reference
│
└─ expect(store.selectionMade).toBe(true)  ◄─── Step 5: Assert (should pass)
   expect(store.playerChoice).toBe('power')
```

### Property Descriptor Usage (Guard Tokens ONLY)

```
Regular Properties:
┌────────────────────┐
│ store.selectionMade = true  ◄─── Direct assignment
│ store.playerChoice = stat   ◄─── Direct assignment
│ (Writable, Enumerable)
└────────────────────┘

Guard Tokens:
┌────────────────────┐
│ Object.defineProperty(store, GUARD_SYMBOL, {
│   enumerable: false,   ◄─── Hidden
│   writable: true,
│   value: true
│ })
│ (For internal-only state)
└────────────────────┘
```

---

## Search Results Summary

### Object Freezing/Sealing (Complete Search)

```bash
grep -r "Object.freeze" src/helpers/classicBattle/ → FOUND: 0
grep -r "Object.seal" src/helpers/classicBattle/   → FOUND: 0
```

### Property Descriptors (Found 5)

```
1. src/helpers/classicBattle/storeGuard.js:32
   - For: ROUND_START_GUARD token (Symbol.for)
   - Type: Non-enumerable guard property

2. src/helpers/classicBattle/storeGuard.js:92
   - For: Hidden value storage
   - Type: Non-enumerable internal value

3. src/helpers/classicBattle/selectionHandler.js:30
   - For: SELECTION_IN_FLIGHT_GUARD token (Symbol.for)
   - Type: Non-enumerable guard property

4. src/helpers/classicBattle/selectionHandler.js:54
   - For: Hidden value storage
   - Type: Non-enumerable internal value

5. src/helpers/classicBattle/uiHelpers.js:897
   - For: STAT_BUTTON_HANDLER_KEY token
   - Type: Non-enumerable handler registry

All 5 use defineProperty for INTERNAL guard tokens/symbols, NOT for
regular properties like selectionMade or playerChoice.
```

### Mutation Sites (Found 17)

```
selectionMade mutations:
  - selectionHandler.js:321 ← PRIMARY (in applySelectionToStore)
  - selectionHandler.js:767
  - controller.js:105
  - roundManager.js:272
  - roundManager.js:308
  - roundManager.js:1218
  - stateHandlers/waitingForPlayerActionEnter.js:43

playerChoice mutations:
  - selectionHandler.js:241 ← Reset
  - selectionHandler.js:323 ← PRIMARY (in applySelectionToStore)
  - roundResolver.js:217
  - roundManager.js:274
  - stateHandlers/interruptStateCleanup.js:48
  - stateHandlers/roundOverEnter.js:15
  - stateHandlers/waitingForPlayerActionEnter.js:45

All use direct assignment pattern:
  store.selectionMade = true;
  store.playerChoice = stat;
```

---

## Verification Logging Points

When `IS_VITEST = true`, these debug logs appear:

### Mutation Verification Logs

```javascript
// Before mutation
console.log("[applySelectionToStore] BEFORE:", {
  selectionMade: store.selectionMade,     // false
  playerChoice: store.playerChoice,        // null
  storeObject: store
});

// After mutation (with verification)
const afterSelectionMade = store.selectionMade;  // Should be true
const afterPlayerChoice = store.playerChoice;    // Should be stat

if (afterSelectionMade !== true || afterPlayerChoice !== stat) {
  throw new Error(
    `[applySelectionToStore] MUTATION FAILED!` +
    `Expected selectionMade=true, playerChoice=${stat},` +
    `but got selectionMade=${afterSelectionMade}, playerChoice=${afterPlayerChoice}`
  );
}

console.log("[applySelectionToStore] AFTER:", {
  selectionMade: store.selectionMade,      // true
  playerChoice: store.playerChoice,        // stat
  checkStorePersistence: {
    viaProperty: store.selectionMade,      // true
    viaReference: store["selectionMade"]   // true
  }
});
```

### Selection Flow Logs

```javascript
[selectStat] Called with stat: power
[selectStat] Calling handleStatSelection with: { stat, playerVal, opponentVal, ... }
[handleStatSelection] Called with: { stat, playerVal, opponentVal, ... }
[validateAndApplySelection] Validating state...
[applySelectionToStore] BEFORE: { selectionMade: false, playerChoice: null, ... }
[applySelectionToStore] AFTER: { selectionMade: true, playerChoice: 'power', ... }
[dispatchStatSelected] START: { stat, playerVal, opponentVal, ... }
[dispatchStatSelected] After emitSelectionEvent: { storeSelectionMade: true, storePlayerChoice: 'power' }
[handleStatSelection] After syncResultDisplay: { storeSelectionMade: true, storePlayerChoice: 'power', ... }
```

---

## Mutation Guarantee Points

These points guarantee mutations worked correctly:

1. **No error thrown** from verification block (lines 326-345)
2. **VITEST logs appear** showing AFTER state as true/stat
3. **Same store reference** returned from getBattleStore()
4. **Promise returned** and awaited by test

If ANY of these fail:
- ❌ Error thrown → Mutation verification failed
- ❌ No logs → Verification code not reached (earlier error)
- ❌ Different reference → Store reference changed (test setup issue)
- ❌ Promise not awaited → Race condition

---

## Conclusion

**The store mutation system is working correctly.**

**All mutations to `selectionMade` and `playerChoice`:**
- ✅ Apply to the correct store object
- ✅ Persist in the same reference
- ✅ Are verified immediately
- ✅ Are not blocked by freezing/sealing
- ✅ Are not affected by property descriptors
- ✅ Include comprehensive debug logging

**If tests fail, check:**
1. Is `selectStat()` promise awaited?
2. Is the store reference the same before/after?
3. Are assertions running before async completes?
4. Are test globals (`window`, `document`) preserved?

