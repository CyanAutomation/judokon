# Snackbar Failure Analysis: "Opponent is choosing" Message Not Appearing

**Date**: January 5, 2026  
**Status**: Critical Regression - Blocking Merge  
**Affected Tests**: Playwright battle-classic tests expecting opponent messages

---

## Executive Summary

During refactoring to eliminate duplicate snackbars and unify all snackbar display through SnackbarManager, a critical regression was introduced: the "Opponent is choosing" message never appears in Playwright tests. Investigation reveals the `statSelected` event handler in `uiEventHandlers.js` is not executing at all during tests.

**Key Finding**: Handler registration appears to succeed, but the handler code never runs when the `statSelected` event is emitted.

---

## Architecture Changes (Completed)

### ✅ Successfully Implemented

1. **Removed Duplicate Handler** (`src/helpers/classicBattle/roundUI.js`)
   - Deleted `bindStatSelected()` function that created duplicate event listener
   - Simplified `handleStatSelectedEvent()` to only handle DOM state (no snackbar calls)
   - Removed `showSnackbar` parameter passing through dynamic handler chain

2. **Unified Snackbar System** (`src/helpers/SnackbarManager.js`)
   - Priority-based snackbar display: HIGH > NORMAL > LOW
   - Capacity management (max 2 concurrent)
   - Auto-dismiss and minimum duration enforcement
   - **Unit tests: 23/23 PASSING** ✅

3. **Updated Event Handlers** (`src/helpers/classicBattle/uiEventHandlers.js`)
   - Complete rewrite of `statSelected` handler to use SnackbarManager
   - Added `currentOpponentSnackbarController` and `currentPickedSnackbarController`
   - Removed legacy functions: `showPromptAndCaptureTimestamp`, `displayOpponentChoosingPrompt`, `showOpponentPromptMessage`
   - Handler now shows opponent message with HIGH priority (no "You Picked" message)

4. **Countdown Integration** (`src/helpers/CooldownRenderer.js`)
   - Updated to use SnackbarManager with HIGH priority
   - Dismisses opponent snackbar before showing countdown
   - Uses `dismissOpponentSnackbar()` export from uiEventHandlers

5. **Test Expectations Updated**
   - `playwright/battle-classic/round-flow.spec.js` - expects countdown to replace opponent message
   - `playwright/battle-classic/opponent-message.spec.js` - added comment about replacement behavior

6. **Timing Coordination Added** (`src/helpers/classicBattle/roundResolver.js`)
   - Modified `computeRoundResult()` to await `getStatSelectedHandlerPromise()` before resolving round
   - Prevents race condition where round resolves before opponent message delay expires

---

## Critical Regression: Handler Not Executing

### Symptoms

**Observed Behavior:**
```
Test: "opponent reveal cleans up properly on match end"
Expected: "Opponent is choosing" message appears after stat click
Actual: 
  - 6× Shows "First to 3 points wins."
  - 3× Shows empty string ""
  - Never shows "Opponent is choosing"
```

**Test Failure Pattern:**
```javascript
const snackbar = page.locator(selectors.snackbarContainer());
await expect(snackbar).toContainText(/Opponent is choosing/i);
// ❌ FAILS: Timeout after 5000ms
// Received: "" (empty string)
```

### Investigation Timeline

#### Hypothesis 1: Timing Race Condition ❌
**Theory**: Opponent message delay (500ms) expires after round resolution  
**Evidence**: 
- Default opponent delay: 500ms (`src/helpers/classicBattle/snackbar.js`)
- Test `resolveDelay`: 50ms (faster than opponent delay)
- Tests set `opponentDelayMessage: true` by default

**Actions Taken**:
1. Added coordination in `roundResolver.js` to await handler promise
2. Changed test default to `opponentDelayMessage: false` to disable delay

**Result**: ❌ Still failing - message never appears even with delay disabled

**Conclusion**: NOT a timing issue. Handler is not executing at all.

#### Hypothesis 2: Priority System Malfunction ❌
**Theory**: HIGH priority not replacing LOW priority init message  
**Evidence**:
- "First to 5 points wins" shown with LOW priority, 3sec autoDismiss
- "Opponent is choosing" should show with HIGH priority, replacing LOW
- SnackbarManager has correct priority comparison logic

**Actions Taken**:
- Verified `canDisplay()` logic returns true for HIGH when LOW is active
- Verified capacity management removes lowest priority when at max
- Ran SnackbarManager unit tests

**Result**: ✅ All 23 SnackbarManager tests pass - priority system works correctly

**Conclusion**: SnackbarManager foundation is solid. Issue is in integration layer.

#### Hypothesis 3: Handler Not Executing ✅ CONFIRMED
**Theory**: The `statSelected` event handler code never runs  
**Evidence**:
- Added diagnostic data attributes at various points in handler
- `data-stat-selected-handler-called` (top of handler) → NOT FOUND
- `data-opponent-immediate` (inside no-delay branch) → NOT FOUND
- Console logs from handler → NOT APPEARING (even without muting)

**Actions Taken**:
```javascript
// Added to top of statSelected handler
try {
  document.body.setAttribute("data-stat-selected-handler-called", "true");
} catch {}

// Added to no-delay branch
try {
  document.body.setAttribute("data-opponent-immediate", "true");
} catch {}
```

**Result**: ❌ Neither attribute appears in DOM during test execution

**Conclusion**: **Handler code is not executing at all**

---

## Root Cause Analysis

### The Handler Registration Chain

**Expected Flow:**
```
battleClassic.init.js
  └─> Phase 4: initializePhase4_EventHandlers()
       └─> bindUIHelperEventHandlersDynamic() 
            └─> onBattleEvent("statSelected", async (e) => { ... })
                 └─> WeakSet guard: only register once per EventTarget
```

**Event Emission Flow:**
```
User clicks stat button
  └─> selectionHandler.js: handleStatSelection()
       └─> emitSelectionEvent()
            └─> emitBattleEvent("statSelected", { ... })
                 └─> Should trigger registered handler
```

### Why Handler Might Not Execute

**Possible Causes (Ranked by Likelihood):**

1. **WeakSet Guard Preventing Registration** (MOST LIKELY)
   - WeakSet key: `globalThis.__cbUIHelpersDynamicBoundTargets`
   - Guards against duplicate registration on same EventTarget
   - Issue: In test environment, EventTarget might be reused across test setup/execution
   - Diagnostic logs show: "EARLY RETURN - Target already has handlers"

2. **Handler Registration Timing**
   - Handler might be registered AFTER event is emitted
   - Or handler might be unregistered between registration and emission
   - Tests use complex initialization with `addInitScript` timing

3. **EventTarget Mismatch**
   - Handler registered on one EventTarget
   - Event emitted on different EventTarget
   - `getBattleEventTarget()` might return different objects in test vs prod

4. **Module Loading Issue**
   - Dynamic import race condition
   - Handler module loaded after event emission
   - Test environment module cache interference

5. **Handler Replaced/Overwritten**
   - Another module registering same event, overwriting our handler
   - Multiple `onBattleEvent("statSelected")` calls from different modules

### Key Code Locations

**Handler Registration:**
```javascript
// src/helpers/classicBattle/uiEventHandlers.js:89-142
export function bindUIHelperEventHandlersDynamic(deps = {}) {
  const KEY = "__cbUIHelpersDynamicBoundTargets";
  target = getBattleEventTarget();
  const set = (globalThis[KEY] ||= new WeakSet());
  
  if (set.has(target)) {
    console.log(`[Handler Registration] EARLY RETURN - Target ${targetId} already has handlers`);
    return; // ⚠️ SUSPECT: Might be returning early in tests
  }
  
  set.add(target);
  
  onBattleEvent("statSelected", async (e) => {
    // Handler code that never executes
  });
}
```

**Event Emission:**
```javascript
// src/helpers/classicBattle/selectionHandler.js:689
emitBattleEvent("statSelected", { store, stat, playerVal, opponentVal, opts: eventOpts });
```

**Battle Events Infrastructure:**
```javascript
// src/helpers/classicBattle/battleEvents.js
let eventTargetInstance = null;

export function getBattleEventTarget() {
  if (!eventTargetInstance) {
    eventTargetInstance = new EventTarget();
  }
  return eventTargetInstance;
}

export function emitBattleEvent(eventType, detail) {
  const target = getBattleEventTarget();
  const event = new CustomEvent(eventType, { detail });
  target.dispatchEvent(event);
}
```

---

## Diagnostic Data Collected

### Test Execution Evidence

**DOM State at Failure:**
- Snackbar container: `<div role="status" id="snackbar-container">` (empty)
- Body attributes: No `data-stat-selected-handler-called` or `data-opponent-immediate`
- Test sees 6× "First to 3 points wins", then 3× empty string
- Round completes successfully (scores update, game progresses)

**Handler Diagnostics:**
```javascript
// Expected to see in DOM (but DON'T):
<body data-stat-selected-handler-called="true" 
      data-opponent-immediate="true" ...>
```

**Console Logs (Muted but should appear in trace):**
```javascript
// Expected logs (but DON'T appear):
"[statSelected Handler] Event received"
"[statSelected Handler] No delay - showing opponent prompt immediately"
"[SnackbarManager] Created snackbar: 'Opponent is choosing'"
```

### Test Configuration

**Test Setup** (`playwright/battle-classic/support/opponentRevealTestSupport.js:939-970`):
```javascript
export async function initializeBattle(page, config = {}) {
  const {
    featureFlags = { 
      showRoundSelectModal: true, 
      opponentDelayMessage: false  // ⚠️ Changed to false during investigation
    },
    // ...
  } = config;

  await page.addInitScript(({ timers, cooldown, delay, flags }) => {
    window.__OVERRIDE_TIMERS = timers;
    window.__FF_OVERRIDES = { showRoundSelectModal: true, ...flags };
    window.process = { env: { VITEST: "1" } };
    window.__AUTO_CONTINUE = false;
  }, { /* ... */ });

  await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });
  await startMatchAndAwaitStats(page, matchSelector);
}
```

---

## Proposed Fix Plan

### Phase 1: Root Cause Verification (30 min)

**Goal**: Confirm exact reason handler doesn't execute

**Tasks:**
1. **Check Handler Registration**
   ```javascript
   // Add to bindUIHelperEventHandlersDynamic()
   const registrationId = Math.random().toString(36);
   window.__HANDLER_REGISTRATION_ID = registrationId;
   console.log(`[Registration] ID: ${registrationId}, Target:`, target);
   
   onBattleEvent("statSelected", async (e) => {
     window.__HANDLER_EXECUTED = registrationId;
     console.log(`[Handler] Executing with ID: ${registrationId}`);
     // ... rest of handler
   });
   ```

2. **Verify Event Emission**
   ```javascript
   // Add to selectionHandler.js:emitSelectionEvent()
   console.log("[Event Emission] About to emit statSelected", { 
     target: getBattleEventTarget(),
     hasListeners: getBattleEventTarget().addEventListener.length
   });
   ```

3. **Check WeakSet State**
   ```javascript
   // Before WeakSet check in bindUIHelperEventHandlersDynamic()
   console.log("[WeakSet] Checking registration", {
     targetId,
     inSet: set.has(target),
     setSize: 'unknown', // WeakSet doesn't expose size
     globalKey: KEY
   });
   ```

4. **Run Test with Diagnostics**
   - Temporarily remove `withMutedConsole` wrapper from failing test
   - Check browser console output in Playwright trace viewer
   - Verify diagnostic window properties appear

### Phase 2: Implement Fix (1-2 hours)

**Option A: Clear WeakSet Between Tests** (If WeakSet is the issue)
```javascript
// In test setup (opponentRevealTestSupport.js)
await page.addInitScript(() => {
  // Clear handler registration guard for fresh test state
  delete globalThis.__cbUIHelpersDynamicBoundTargets;
});
```

**Option B: Force Re-registration** (If handler gets cleared)
```javascript
// Add to bindUIHelperEventHandlersDynamic()
export function bindUIHelperEventHandlersDynamic(deps = {}, { force = false } = {}) {
  const KEY = "__cbUIHelpersDynamicBoundTargets";
  target = getBattleEventTarget();
  const set = (globalThis[KEY] ||= new WeakSet());
  
  if (set.has(target) && !force) {
    return; // Skip unless forced
  }
  
  set.add(target);
  // ... register handlers
}

// In test environment initialization
if (IS_TEST_ENV) {
  bindUIHelperEventHandlersDynamic({}, { force: true });
}
```

**Option C: Use Different EventTarget Per Test** (If target reuse is the issue)
```javascript
// Modify battleEvents.js
export function resetBattleEventTarget() {
  eventTargetInstance = new EventTarget();
  return eventTargetInstance;
}

// In test setup
await page.addInitScript(() => {
  // Assuming battleEvents is available
  window.__battleEvents?.resetBattleEventTarget();
});
```

**Option D: Alternative Handler Registration** (Nuclear option)
```javascript
// Remove WeakSet guard entirely for test environment
export function bindUIHelperEventHandlersDynamic(deps = {}) {
  const target = getBattleEventTarget();
  
  // In tests, always register (no WeakSet guard)
  if (IS_TEST_ENV) {
    onBattleEvent("statSelected", async (e) => { /* handler */ });
    return;
  }
  
  // Production: use WeakSet guard
  const KEY = "__cbUIHelpersDynamicBoundTargets";
  const set = (globalThis[KEY] ||= new WeakSet());
  if (set.has(target)) return;
  set.add(target);
  
  onBattleEvent("statSelected", async (e) => { /* handler */ });
}
```

### Phase 3: Validation (30 min)

**Test Suite to Run:**
```bash
# 1. Single failing test
npx playwright test -g "opponent reveal cleans up properly" playwright/battle-classic/round-flow.spec.js

# 2. All opponent message tests
npx playwright test playwright/battle-classic/opponent-message.spec.js
npx playwright test playwright/battle-classic/round-flow.spec.js

# 3. Full classic battle suite
npx playwright test playwright/battle-classic/

# 4. Unit tests (ensure no regressions)
npx vitest run tests/helpers/SnackbarManager.test.js
npx vitest run tests/helpers/cooldown-suppression.test.js
```

**Success Criteria:**
- [ ] "Opponent is choosing" message appears in all relevant tests
- [ ] Message is replaced by countdown as expected
- [ ] No duplicate messages appear
- [ ] All SnackbarManager unit tests pass
- [ ] No new Playwright test failures
- [ ] Console logs show handler execution with correct timing

### Phase 4: Cleanup (15 min)

1. **Remove Diagnostic Code**
   - Remove all `data-*` attributes added for debugging
   - Remove temporary console logs
   - Remove commented-out code

2. **Restore Production Behavior**
   - Ensure fix works in both test and production environments
   - Verify no performance impact from changes

3. **Update Documentation**
   - Document WeakSet guard behavior and test considerations
   - Add comments explaining handler registration timing
   - Update AGENTS.md with new findings if architectural

---

## Opportunities for Improvement

### 1. Handler Registration System

**Current Issues:**
- WeakSet guard is opaque (no visibility into what's registered)
- No way to verify handler registration succeeded
- No clear error messages when registration is skipped
- Difficult to debug in test environments

**Proposed Improvements:**
```javascript
// Add registration tracking and diagnostics
class HandlerRegistry {
  constructor() {
    this.registrations = new Map(); // target -> { handlers: Set, registeredAt: Date }
  }
  
  register(target, eventType, handler) {
    if (!this.registrations.has(target)) {
      this.registrations.set(target, { handlers: new Set(), registeredAt: new Date() });
    }
    
    const entry = this.registrations.get(target);
    const handlerId = `${eventType}:${handler.name || 'anonymous'}`;
    
    if (entry.handlers.has(handlerId)) {
      console.warn(`[HandlerRegistry] Handler ${handlerId} already registered on target`);
      return false;
    }
    
    entry.handlers.add(handlerId);
    target.addEventListener(eventType, handler);
    return true;
  }
  
  isRegistered(target, eventType, handler) {
    const entry = this.registrations.get(target);
    const handlerId = `${eventType}:${handler.name || 'anonymous'}`;
    return entry?.handlers.has(handlerId) ?? false;
  }
  
  getDiagnostics() {
    return {
      targetCount: this.registrations.size,
      handlers: Array.from(this.registrations.entries()).map(([target, data]) => ({
        target: target.constructor.name,
        handlerCount: data.handlers.size,
        handlers: Array.from(data.handlers),
        registeredAt: data.registeredAt
      }))
    };
  }
}
```

### 2. Event Flow Visibility

**Current Issues:**
- No way to trace event flow from emission to handler
- Difficult to debug when events don't reach handlers
- No metrics on event processing time

**Proposed Improvements:**
```javascript
// Add event tracing middleware
const eventTracer = {
  traces: [],
  
  onEmit(eventType, detail) {
    const trace = {
      id: crypto.randomUUID(),
      type: eventType,
      emittedAt: performance.now(),
      detail,
      handlers: []
    };
    this.traces.push(trace);
    return trace.id;
  },
  
  onHandlerStart(traceId, handlerName) {
    const trace = this.traces.find(t => t.id === traceId);
    if (trace) {
      trace.handlers.push({
        name: handlerName,
        startedAt: performance.now(),
        duration: null
      });
    }
  },
  
  onHandlerEnd(traceId, handlerName) {
    const trace = this.traces.find(t => t.id === traceId);
    const handler = trace?.handlers.find(h => h.name === handlerName);
    if (handler) {
      handler.duration = performance.now() - handler.startedAt;
    }
  },
  
  getDiagnostics() {
    return this.traces.map(t => ({
      type: t.type,
      latency: t.handlers[0]?.startedAt - t.emittedAt,
      totalDuration: t.handlers.reduce((sum, h) => sum + (h.duration || 0), 0),
      handlerCount: t.handlers.length
    }));
  }
};
```

### 3. Test Environment Isolation

**Current Issues:**
- Shared global state between tests (WeakSet, EventTarget)
- No clear reset mechanism for test cleanup
- Difficult to ensure fresh state per test

**Proposed Improvements:**
```javascript
// Add test utilities for clean state management
export const testUtils = {
  resetBattleState() {
    // Clear WeakSet guards
    delete globalThis.__cbUIHelpersDynamicBoundTargets;
    
    // Reset EventTarget
    eventTargetInstance = null;
    
    // Clear SnackbarManager
    snackbarManager.clearAll();
    
    // Reset handler registration
    handlerRegistry.clear();
  },
  
  verifyHandlersRegistered() {
    const diagnostics = handlerRegistry.getDiagnostics();
    const requiredHandlers = ['statSelected', 'roundResolved', 'opponentReveal'];
    const registered = diagnostics.handlers.flatMap(h => h.handlers);
    
    for (const required of requiredHandlers) {
      if (!registered.some(h => h.includes(required))) {
        throw new Error(`Required handler not registered: ${required}`);
      }
    }
  }
};

// In test setup
beforeEach(async () => {
  await page.evaluate(() => window.__testUtils.resetBattleState());
});

afterEach(async () => {
  await page.evaluate(() => window.__testUtils.resetBattleState());
});
```

### 4. SnackbarManager Integration

**Current Issues:**
- Handler code mixes snackbar display with business logic
- Difficult to test snackbar display in isolation
- Tight coupling between event handlers and SnackbarManager

**Proposed Improvements:**
```javascript
// Extract snackbar orchestration into dedicated service
class SnackbarOrchestrator {
  constructor(manager) {
    this.manager = manager;
    this.controllers = new Map();
  }
  
  showOpponentMessage(message, options = {}) {
    this.dismissOpponentMessage();
    
    const controller = this.manager.show({
      message,
      priority: SnackbarPriority.HIGH,
      ...options
    });
    
    this.controllers.set('opponent', controller);
    return controller;
  }
  
  dismissOpponentMessage() {
    const controller = this.controllers.get('opponent');
    if (controller) {
      controller.remove();
      this.controllers.delete('opponent');
    }
  }
  
  showCountdown(message, options = {}) {
    this.dismissOpponentMessage(); // Countdown replaces opponent
    
    const controller = this.manager.show({
      message,
      priority: SnackbarPriority.HIGH,
      ...options
    });
    
    this.controllers.set('countdown', controller);
    return controller;
  }
}

// In event handler
const orchestrator = new SnackbarOrchestrator(snackbarManager);

onBattleEvent("statSelected", async (e) => {
  // Simplified handler - no snackbar details
  await orchestrator.showOpponentMessage(t("ui.opponentChoosing"), {
    minDuration: 750,
    autoDismiss: 0
  });
});
```

### 5. Coordination Primitives

**Current Issues:**
- Ad-hoc promise coordination between handlers and battle flow
- No standard pattern for "wait for handler completion"
- Difficult to ensure proper sequencing

**Proposed Improvements:**
```javascript
// Add coordination utilities
class HandlerCoordinator {
  constructor() {
    this.promises = new Map();
  }
  
  register(handlerName, promise) {
    this.promises.set(handlerName, promise);
  }
  
  async waitFor(handlerName, timeoutMs = 5000) {
    const promise = this.promises.get(handlerName);
    if (!promise) {
      console.warn(`[Coordinator] No promise registered for ${handlerName}`);
      return;
    }
    
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Handler ${handlerName} timeout`)), timeoutMs)
      )
    ]);
  }
  
  clear(handlerName) {
    this.promises.delete(handlerName);
  }
}

// In handler
const coordinator = new HandlerCoordinator();

onBattleEvent("statSelected", async (e) => {
  const handlerPromise = (async () => {
    // Handler logic
  })();
  
  coordinator.register('statSelected', handlerPromise);
  return handlerPromise;
});

// In round resolution
await coordinator.waitFor('statSelected');
// Now safe to proceed with round resolution
```

---

## Summary

**Critical Issue**: The `statSelected` event handler is not executing in Playwright tests, preventing the "Opponent is choosing" message from appearing.

**Most Likely Root Cause**: WeakSet guard returning early in test environment, preventing handler registration on subsequent test runs or during test-specific initialization sequences.

**Immediate Action Required**: 
1. Add diagnostic logging to confirm WeakSet behavior in tests
2. Implement fix to ensure handler executes (likely clearing WeakSet or using test-specific registration)
3. Validate fix across full Playwright test suite

**Long-Term Improvements**: Consider more robust handler registration system with better visibility, test isolation utilities, and clearer coordination patterns.

**Status**: Ready for investigation Phase 1 - awaiting review and approval to proceed with diagnostic verification.
