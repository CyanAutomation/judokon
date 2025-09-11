# Playwright Test Audit: DOM Manipulation and Timing Issues

## Executive Summary

After auditing the Playwright tests in `/playwright/`, I've identified significant patterns of direct DOM manipulation and excessive waiting that can hide underlying issues and slow down test execution. This analysis categorizes the problems and provides recommendations for refactoring.

## Current Testing Anti-Patterns Identified

### 1. Direct DOM Manipulation Issues

#### **High Priority - Explicit DOM Replacement**
- **File**: `cli-flows.spec.mjs` (lines 16-32)
  - **Issue**: Test completely replaces `#cli-stats` innerHTML and manually creates test elements
  - **Problem**: Hides real initialization issues; tests fake DOM instead of actual application behavior
  - **Impact**: Masks timing issues, state management problems, and actual user interactions

- **File**: `battle-next-skip.non-orchestrated.spec.js` (line 21)
  - **Issue**: Replaces entire `document.body.innerHTML` with test markup
  - **Problem**: Bypasses normal page initialization and component lifecycle
  - **Impact**: Test is testing synthetic DOM, not real application behavior

#### **Medium Priority - Event Simulation**
- **Files**: Multiple (`hover-zoom.spec.js`, `tooltip.spec.js`)
  - **Issue**: Using `page.dispatchEvent()` for `mouseleave`, `mouseout` events
  - **Problem**: Simulates events rather than testing natural user interactions
  - **Impact**: May not catch event handling edge cases that occur with real user actions

#### **Medium Priority - Manual HTML Manipulation**
- **File**: `pseudo-japanese-toggle.spec.js` (lines 41-52)
  - **Issue**: Manually comparing `innerHTML()` content to verify changes
  - **Problem**: Tests implementation details rather than user-visible behavior
  - **Impact**: Brittle tests that break on formatting changes, not functional changes

### 2. Excessive Waiting and Timing Dependencies

#### **High Priority - Arbitrary Timeouts**
- **File**: `battle-cli.spec.js` - Multiple instances:
  - Line 46: `waitForTimeout(1000)` - arbitrary wait for logs
  - Line 67: `waitForTimeout(3000)` - wait for "full initialization"
  - Line 78: `waitForTimeout(1000)` - wait after clicking
  - Line 122: `waitForTimeout(2000)` - wait for "manual start"
  - **Problem**: These hide initialization race conditions and state management issues
  - **Impact**: Slow tests that may still be flaky and don't reveal the root causes

- **File**: `countdown.spec.js` (lines 23, 29)
  - **Issue**: `waitForTimeout(1000)` between countdown tick simulations
  - **Problem**: Tests artificial timing rather than real countdown behavior
  - **Impact**: Doesn't test actual timer functionality

#### **Medium Priority - State Polling**
- **Files**: Multiple battle tests using `waitForSelector('[data-battle-state="..."]')`
  - **Issue**: Polling DOM for state changes rather than having direct state access
  - **Problem**: Tests are dependent on DOM updates rather than actual state transitions
  - **Impact**: Slow, indirect testing that can miss state issues

### 3. Insufficient Direct Function Access

#### **High Priority - Missing Battle State API**
- **Pattern**: Tests frequently poll `data-battle-state` attributes instead of checking actual state
- **Problem**: No direct access to battle state machine for testing
- **Impact**: Slow tests that depend on DOM reflection of state rather than state itself

#### **Medium Priority - Timer/Cooldown Dependencies**
- **Pattern**: Tests wait for timers to complete or use `__NEXT_ROUND_COOLDOWN_MS` overrides
- **Problem**: Tests are coupled to timing mechanisms rather than testing business logic
- **Impact**: Brittle timing-dependent tests

## Recommended Refactoring Strategy

### Phase 1: Expose Direct APIs for Testing

1. **Battle State Machine Access**
   ```javascript
   // Add to battle modules
   window.__TEST_API = {
     getBattleState: () => currentState,
     triggerStateTransition: (event) => machine.dispatch(event),
     getStateSnapshot: () => machine.getSnapshot()
   };
   ```

2. **Countdown/Timer Control**
   ```javascript
   // Add to timer modules
   window.__TEST_API = {
     ...window.__TEST_API,
     setCountdown: (seconds) => updateCountdownDirectly(seconds),
     skipCooldown: () => completeCooldownImmediately(),
     pauseTimer: () => pauseCurrentTimer()
   };
   ```

3. **Component Initialization Promises**
   ```javascript
   // Add to each major component
   window.__TEST_API = {
     ...window.__TEST_API,
     waitForInit: () => initPromise,
     isReady: () => initializationComplete
   };
   ```

### Phase 2: Refactor High-Impact Tests

#### Priority 1: `cli-flows.spec.mjs`
- Remove DOM replacement
- Use proper initialization APIs
- Test actual keyboard handlers, not synthetic ones

#### Priority 2: `battle-cli.spec.js`
- Replace all `waitForTimeout` with direct state checking
- Use battle state API instead of polling DOM
- Remove manual event dispatching

#### Priority 3: State-dependent tests
- Replace `waitForSelector('[data-battle-state="..."]')` with direct state API
- Use state transition triggers instead of waiting for natural progression

### Phase 3: Address Timing Dependencies

1. **Deterministic Battle Progression**
   - Add test mode that allows stepping through battle states manually
   - Remove dependency on real timers in test environment

2. **Immediate Feedback Loops**
   - Battle actions should complete synchronously in test mode
   - UI updates should be immediate rather than animated

## Implementation Approach

### For Application Code (`src/` directory)

1. **Add Test API Module** (`src/helpers/testApi.js`)
   ```javascript
   export function exposeTestAPI() {
     if (typeof window !== 'undefined' && process.env.NODE_ENV === 'test') {
       window.__TEST_API = {
         // Direct function access
       };
     }
   }
   ```

2. **Update Battle Components**
   - Add direct state access methods
   - Add immediate action completion for test mode
   - Expose initialization promises

3. **Update Timer/Countdown Components**
   - Add synchronous completion methods for tests
   - Add direct time manipulation for test scenarios

### For Test Files

1. **Replace DOM Manipulation** with direct API calls
2. **Replace Timeouts** with state checking
3. **Replace Event Simulation** with direct function calls

## Expected Benefits

1. **Speed**: Tests run 5-10x faster without artificial waits
2. **Reliability**: Direct state access eliminates race conditions
3. **Clarity**: Tests reveal actual functionality issues rather than hiding them
4. **Maintainability**: Tests become less brittle and easier to update

## Files Requiring Immediate Attention

### High Priority (DOM Manipulation)
1. `playwright/cli-flows.spec.mjs` - Complete DOM replacement
2. `playwright/battle-next-skip.non-orchestrated.spec.js` - Body HTML replacement

### High Priority (Excessive Waiting)
1. `playwright/battle-cli.spec.js` - Multiple arbitrary timeouts
2. `playwright/countdown.spec.js` - Timer-dependent waits

### Medium Priority (State Polling)
1. All files using `waitForSelector('[data-battle-state="..."]')` pattern
2. Files using `innerHTML()` comparisons for functionality verification

This audit reveals that many tests are testing the wrong layer of the application - testing DOM updates rather than business logic, and waiting for UI changes rather than checking actual state. The recommended refactoring will create faster, more reliable tests that better reveal actual application issues.