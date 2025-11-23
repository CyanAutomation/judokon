# Battle Store Mutation Investigation Report

## Executive Summary

Investigation into why mutations to `selectionMade` and `playerChoice` don't persist in the battle store reveals **the mutations ARE actually happening** and being properly set on the store object. The store reference is correctly maintained throughout the call chain.

## Key Findings

### 1. Store Creation Location and Definition

**File**: `src/helpers/classicBattle/roundManager.js:105-124`

```javascript
export function createBattleStore() {
  return {
    selectionMade: false,
    stallTimeoutMs: 35000,
    autoSelectId: null,
    playerChoice: null,
    playerCardEl: null,
    opponentCardEl: null,
    statButtonEls: null,
    currentPlayerJudoka: null,
    currentOpponentJudoka: null,
    lastPlayerStats: null,
    lastOpponentStats: null,
    matchDeck: [],
    matchDeckSize: DEFAULT_MATCH_DECK_SIZE,
    pendingOpponentFromDeck: null,
    usedOpponentIds: new Set()
  };
}
```

**Status**: ✅ Returns a plain object with no freezing or sealing.

### 2. Store Access Flow (How Tests Get the Store)

**Flow Chain**:

```
Test calls getBattleStore()
  ↓
tests/utils/battleStoreAccess.js:getBattleStore()
  ↓
Tries 3 accessors in order:
  1. window.__TEST_API?.inspect?.getBattleStore?.()  [from testApi.js:2361]
  2. window.__classicbattledebugapi?.battleStore
  3. window.battleStore  [set in battleClassic.init.js:1777]
```

**All three paths return DIRECT references to the same store object** (not copies).

### 3. Mutations Are Recorded Correctly

**Location**: `src/helpers/classicBattle/selectionHandler.js:310-360`

The code shows mutations ARE happening with verification:

```javascript
function applySelectionToStore(store, stat, playerVal, opponentVal) {
  const beforeSelectionMade = store.selectionMade;
  const beforePlayerChoice = store.playerChoice;

  store.selectionMade = true; // ← MUTATION 1
  store.__lastSelectionMade = true;
  store.playerChoice = stat; // ← MUTATION 2

  // VERIFICATION: Re-read immediately to check persistence
  if (IS_VITEST) {
    const afterSelectionMade = store.selectionMade;
    const afterPlayerChoice = store.playerChoice;

    if (afterSelectionMade !== true || afterPlayerChoice !== stat) {
      throw new Error(
        `[applySelectionToStore] MUTATION FAILED! Expected selectionMade=true, ` +
          `playerChoice=${stat}, but got selectionMade=${afterSelectionMade}, ` +
          `playerChoice=${afterPlayerChoice}`
      );
    }
  }
}
```

### 4. Call Chain Shows Correct Store References

**Mutation sequence in tests** (from `tests/integration/battleClassic.integration.test.js:50-87`):

```javascript
// Test calls selectStat (store reference passed)
await selectStat(store, selectedStat);
  ↓
// selectStat in uiHelpers.js:742
// - Calls handleStatSelection with same store reference
return handleStatSelection(store, stat, selectionOptions);
  ↓
// handleStatSelection in selectionHandler.js:947
// - Validates state, applies selection
const values = await validateAndApplySelection(store, stat, playerVal, opponentVal);
  ↓
// validateAndApplySelection calls applySelectionToStore
// - Sets store.selectionMade = true
// - Sets store.playerChoice = stat
return applySelectionToStore(store, stat, playerVal, opponentVal);
```

### 5. Property Descriptors on Store

**Found in**:

- `src/helpers/classicBattle/storeGuard.js:32` - Guard tokens added as non-enumerable properties
- `src/helpers/classicBattle/selectionHandler.js:30` - Same pattern

**Status**: ✅ These are **only used for internal guard symbols** (e.g., `SELECTION_IN_FLIGHT_GUARD`), NOT for `selectionMade` or `playerChoice`.

Code pattern:

```javascript
Object.defineProperty(store, token, {
  configurable: true,
  enumerable: false, // Hidden, not enumerable
  writable: true,
  value: true
});
```

**These DO NOT affect normal properties like `selectionMade` or `playerChoice`** since they're set directly via assignment (`store.selectionMade = true`).

### 6. Store is NOT Frozen or Sealed

**Search Result**: No `Object.freeze()` or `Object.seal()` found on store object.

Found:

- 5x `Object.defineProperty()` calls → ALL for guard tokens, not main properties
- 0x `Object.freeze()` calls
- 0x `Object.seal()` calls

### 7. Store Reference Consistency

**Store exposure points**:

1. **battleClassic.init.js:1777** - Store created and exposed:

   ```javascript
   const store = createBattleStore();
   if (typeof window !== "undefined") {
     window.battleStore = store; // Direct reference
   }
   ```

2. **testApi.js:2361** - Returns the same reference:

   ```javascript
   getBattleStore() {
     return isWindowAvailable() ? window.battleStore : null;
   }
   ```

3. **battleStoreAccess.js:16-26** - Test accessor returns same reference:

   ```javascript
   const inspectStore = window.__TEST_API?.inspect?.getBattleStore?.();
   if (inspectStore) {
     return inspectStore; // Same reference returned
   }
   ```

### 8. Evidence of Mutations Persisting

**In actual code** (`selectionHandler.js:321-323`):

```javascript
store.selectionMade = true;
store.__lastSelectionMade = true; // Mirror property for debugging
store.playerChoice = stat;
```

**No intermediate copying** - mutations are direct property assignments on the store object.

## Potential Issues Identified

### Issue 1: Test Isolation / Module Reloads

**Risk**: If `vi.resetModules()` is called, but the store reference is captured in test scope before the reset, test assertions might check an old (or new but separate) store instance.

**Location**: `tests/integration/battleClassic.integration.test.js:207-217`

**Current Code** (GOOD):

```javascript
afterEach(() => {
  dom?.window?.close();
  vi.clearAllMocks();
  // NOTE: vi.resetModules() is NOT used because it clears ALL modules
  // including Node.js built-ins, causing the next test's beforeEach to fail
});
```

**Status**: ✅ Correctly avoiding `vi.resetModules()`.

### Issue 2: JSDOM Globals Not Preserved

**Risk**: In some test configurations, if `global.window` is reset or JSDOM context changes between calls, store references might become invalid.

**Mitigation**: Tests set up globals properly:

```javascript
global.window = window;
global.document = document;
```

**Status**: ✅ Currently handled.

### Issue 3: Store Cloning in Debug Panel

**Location**: `src/helpers/classicBattle/debugPanel.js:226`

```javascript
function getStoreSnapshot(win) {
  const out = {};
  const store = win?.battleStore;
  if (store) {
    out.store = {
      selectionMade: !!store.selectionMade, // Read, not mutate
      playerChoice: store.playerChoice || null
    };
  }
  return out;
}
```

**Status**: ✅ This is READ-ONLY snapshot for debugging. Does not affect mutations.

## Store Property Access Paths

All mutations flow through these verified paths:

| Property        | Set By                        | Location                                        | Status                   |
| --------------- | ----------------------------- | ----------------------------------------------- | ------------------------ |
| `selectionMade` | `applySelectionToStore`       | selectionHandler.js:321                         | ✅ Direct assignment     |
| `playerChoice`  | `applySelectionToStore`       | selectionHandler.js:323                         | ✅ Direct assignment     |
| `selectionMade` | `waitingForPlayerActionEnter` | stateHandlers/waitingForPlayerActionEnter.js:43 | ✅ Reset on state change |
| `playerChoice`  | `waitingForPlayerActionEnter` | stateHandlers/waitingForPlayerActionEnter.js:45 | ✅ Reset on state change |

## Mutation Verification Points

The code includes explicit verification logging when `IS_VITEST` is true:

1. **Before mutation** (applySelectionToStore):

   ```javascript
   console.log("[applySelectionToStore] BEFORE:", { selectionMade, playerChoice, storeObject });
   ```

2. **Immediate re-read** (applySelectionToStore):

   ```javascript
   const afterSelectionMade = store.selectionMade;
   if (afterSelectionMade !== true) {
     throw new Error("MUTATION FAILED!");
   }
   ```

3. **After dispatch** (dispatchStatSelected):

   ```javascript
   console.log("[dispatchStatSelected] After emitSelectionEvent:", {
     storeSelectionMade,
     storePlayerChoice
   });
   ```

4. **After sync** (handleStatSelection):

   ```javascript
   console.log("[handleStatSelection] After syncResultDisplay:", {
     storeSelectionMade,
     storePlayerChoice
   });
   ```

## Conclusion

**The battle store mutations ARE working correctly.** The mutations to `selectionMade` and `playerChoice`:

1. ✅ Happen on the correct store object instance
2. ✅ Are verified immediately after assignment
3. ✅ Are not blocked by Object.freeze/seal
4. ✅ Are not affected by property descriptors (guard tokens use separate symbols)
5. ✅ Are directly accessible via all three accessor paths

## Recommendations

1. **Enable test logging** - Check the Vitest logs when running tests that claim mutations don't persist. The verification code will reveal exactly where (and if) mutations fail.

2. **Verify test setup** - Ensure the store being read after `selectStat()` is the same object instance that was passed to it:

   ```javascript
   const store1 = getBattleStore();
   await selectStat(store1, stat);
   const store2 = getBattleStore();
   console.assert(store1 === store2, "Store reference changed!");
   ```

3. **Check timing** - If mutations appear to not persist, it might be a timing issue where assertions run before async mutations complete:

   ```javascript
   await selectStat(store, stat); // Returns promise
   // ← Ensure you await this!
   expect(store.selectionMade).toBe(true);
   ```

4. **Capture test output** - When tests fail, save the debug logs from verification points:
   - `[applySelectionToStore] BEFORE/AFTER logs`
   - `[handleStatSelection] After validateAndApplySelection logs`
   - Any thrown mutation failure errors

## Files Involved in Mutation Chain

- `src/helpers/classicBattle/roundManager.js` - Store creation
- `src/helpers/classicBattle/selectionHandler.js` - Main mutations with verification
- `src/helpers/classicBattle/uiHelpers.js` - Test entry point (`selectStat`)
- `tests/utils/battleStoreAccess.js` - Test store accessor
- `src/helpers/testApi.js` - Inspect API for test access
- `src/pages/battleClassic.init.js` - Store initialization and exposure
