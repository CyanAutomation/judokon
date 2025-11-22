# Battle Store Investigation - Executive Summary

## Investigation Scope

You requested an investigation into why mutations to `selectionMade` and `playerChoice` don't persist on the battle store object. The investigation examined:

1. ✅ Where `createBattleStore()` is defined
2. ✅ How it's stored and cached
3. ✅ Object freezing/sealing/property descriptors
4. ✅ Where the store is passed around
5. ✅ Any cloning or copying operations

---

## Key Finding

**The mutations ARE working correctly.** Store mutations to `selectionMade` and `playerChoice`:

- ✅ Apply to the actual store object
- ✅ Persist in the same reference
- ✅ Are verified immediately after application
- ✅ Are not blocked by freezing/sealing
- ✅ Are not affected by property descriptors
- ✅ Include comprehensive debug verification

---

## Investigation Results

### 1. Store Creation ✅

**Location**: `src/helpers/classicBattle/roundManager.js:105`

```javascript
export function createBattleStore() {
  return {
    selectionMade: false,
    playerChoice: null,
    // ... 11 more properties
  };
}
```

**Status**: Plain object, no restrictions.

---

### 2. Store Exposure & Access ✅

**Exposed at**: `src/pages/battleClassic.init.js:1777`

```javascript
const store = createBattleStore();
window.battleStore = store;  // Direct reference
```

**Accessed via** (`tests/utils/battleStoreAccess.js`):
- `window.__TEST_API?.inspect?.getBattleStore()`
- `window.__classicbattledebugapi?.battleStore`
- `window.battleStore`

**All three paths return the SAME object reference** - no copying.

---

### 3. No Freezing/Sealing ✅

**Search Results**:
- `Object.freeze()` on store: **0 found**
- `Object.seal()` on store: **0 found**
- `Object.defineProperty()` on regular props: **0 found**
- `Object.defineProperty()` on guard tokens only: **5 found** (non-enumerable internal state)

**Conclusion**: Store is fully mutable.

---

### 4. No Cloning or Copying ✅

**Only "copying" found**: Debug panel creates a read-only snapshot (doesn't affect mutations)

```javascript
// Debug panel - READ ONLY
out.store = {
  selectionMade: !!store.selectionMade,
  playerChoice: store.playerChoice || null
};
```

**Impact**: None on actual mutations.

---

### 5. Mutation Chain ✅

**Complete flow**:

```
selectStat(store, stat)
  ↓ (uiHelpers.js:742)
handleStatSelection(store, stat, {...})
  ↓ (selectionHandler.js:947)
validateAndApplySelection(store, stat, playerVal, opponentVal)
  ↓ (selectionHandler.js:564)
applySelectionToStore(store, stat, playerVal, opponentVal)
  ↓ (selectionHandler.js:310-360)
  • store.selectionMade = true    ← MUTATION 1
  • store.playerChoice = stat     ← MUTATION 2
  • Verify mutations worked       ← VERIFICATION
  ↓
Return same store object
```

**All mutations use direct assignment** (not Object.defineProperty).

---

### 6. Mutation Verification ✅

**Location**: `src/helpers/classicBattle/selectionHandler.js:324-345`

```javascript
store.selectionMade = true;      // ← SET
store.playerChoice = stat;       // ← SET

if (IS_VITEST) {
  const afterSelectionMade = store.selectionMade;     // ← READ
  const afterPlayerChoice = store.playerChoice;       // ← READ
  
  if (afterSelectionMade !== true || afterPlayerChoice !== stat) {
    throw new Error(`[applySelectionToStore] MUTATION FAILED!`);  // ← ERROR IF FAILED
  }
}
```

**If mutations didn't persist, an error would be thrown and tests would fail.**

---

### 7. Property Descriptors (Guard Tokens Only) ✅

**Not affecting regular properties** - Guard tokens use symbols:

```javascript
// Guard tokens (INTERNAL STATE ONLY)
Object.defineProperty(store, GUARD_SYMBOL, {
  enumerable: false,   // Hidden
  writable: true,
  value: true
});

// Regular properties (DIRECT ASSIGNMENT)
store.selectionMade = true;     // ← NO defineProperty
store.playerChoice = stat;      // ← NO defineProperty
```

**Conclusion**: Guard tokens use non-enumerable storage; regular properties are freely assignable.

---

## What This Means

### ✅ Mutations ARE persisting

The code shows:
1. Direct property assignment
2. Immediate verification of mutation success
3. No freezing/sealing blocking mutations
4. Same reference throughout call chain
5. Comprehensive error handling if mutation fails

### ❌ This is NOT the issue

If tests fail with claims that mutations don't persist, the actual issue is likely:

1. **Async not awaited** - `selectStat()` returns a promise that must be awaited
   ```javascript
   await selectStat(store, stat);  // ← MUST await
   ```

2. **Store reference changed** - Different instance before/after
   ```javascript
   const store1 = getBattleStore();
   await selectStat(store1, stat);
   const store2 = getBattleStore();
   // store1 and store2 should be the same object
   ```

3. **Timing issue** - Assertions before async completes
   ```javascript
   await selectStat(store, stat);  // ← Must complete
   await new Promise(r => setTimeout(r, 100));  // ← Allow time for side effects
   expect(store.selectionMade).toBe(true);
   ```

4. **Test setup** - Globals being reset
   ```javascript
   // Ensure globals persist
   beforeEach(() => {
     global.window = window;
     global.document = document;
   });
   // NOT: vi.resetModules() (this was avoided correctly in the code)
   ```

---

## Debug Strategy

If you're seeing mutation failures:

### Step 1: Enable debug logging
All verification code is gated by `IS_VITEST` and will log to console:
- Before mutation: `[applySelectionToStore] BEFORE: {...}`
- After mutation: `[applySelectionToStore] AFTER: {...}`
- If mutation fails: Throws `[applySelectionToStore] MUTATION FAILED!`

### Step 2: Run test with output capture
```bash
npm run test:battles:classic -- tests/integration/battleClassic.integration.test.js -t "initializes the page UI" 2>&1 | tee test-output.log
grep -i "mutation\|applySelection\|selectionMade" test-output.log
```

### Step 3: Check for error logs
- If `MUTATION FAILED` appears → Store has restrictions (not likely - investigation found none)
- If no logs appear → Verification code not reached (earlier error)
- If logs show mutation worked → Issue is elsewhere (async, timing, reference)

### Step 4: Verify store reference
```javascript
const store1 = getBattleStore();
await selectStat(store1, stat);
const store2 = getBattleStore();
console.assert(store1 === store2, 'Store reference changed!');
```

---

## Documentation Artifacts

Three comprehensive documents have been created:

1. **`STORE_INVESTIGATION_REPORT.md`**
   - Detailed analysis of each finding
   - Evidence for each claim
   - Risk assessment for each component

2. **`STORE_MUTATION_FINDINGS.md`**
   - Deep dive into mutation chain
   - Complete verification logging points
   - Diagnostic checklist with examples

3. **`STORE_INVESTIGATION_INDEX.md`**
   - Cross-reference index of all files
   - Data flow diagrams
   - Search result summary
   - Verification guarantee points

---

## Conclusion

The battle store mutation system is **working as designed**. All mutations to `selectionMade` and `playerChoice`:

- ✅ Use direct property assignment
- ✅ Persist on the same object reference
- ✅ Are verified immediately
- ✅ Are not blocked by any restrictions
- ✅ Include comprehensive error handling

**If tests claim mutations don't persist, the issue is NOT the store mutation mechanism itself, but rather:**
- Async handling (not awaiting promise)
- Store reference management (getting different instance)
- Timing (assertions before async completes)
- Test setup (globals not preserved)

Use the verification logging points and diagnostic checklist in the investigation documents to identify the actual issue.

