# Technical Debt Implementation Plan

## 📋 Executive Summary

This document outlines a phased approach to address three critical technical debt areas:
1. **State Handler Contract Compliance** - Fix missing implementations in battle state handlers
2. **Event System Standardization** - Unify inconsistent event naming patterns  
3. **Debug Infrastructure** - Add structured logging without violating console discipline

**Total Estimated Effort**: 18-24 hours across 3 phases
**Risk Level**: Medium (state machine changes require careful testing)
**Dependencies**: Phases can be executed independently

---

## 🎯 Phase 1: State Handler Audit & Contract Compliance

**Objective**: Ensure all state handlers implement their documented contracts from `stateTable.js`

**Risk Assessment**: 🟡 Medium
- **High Impact**: State handler bugs can break battle flow
- **Mitigation**: Comprehensive testing + rollback procedures

**Scope Analysis**:
- 14 state handlers in `/src/helpers/classicBattle/stateHandlers/`
- Each state in `stateTable.js` defines required `onEnter` actions
- Known issue: `waitingForPlayerActionEnter.js` missing `timer:startStatSelection`

**Detailed Implementation Plan**:

### Phase 1.1: Contract Discovery & Mapping ⏱️ _3-4 hours_ ✅ **COMPLETED**

**Task Contract**:
```json
{
  "inputs": ["src/helpers/classicBattle/stateTable.js", "src/helpers/classicBattle/stateHandlers/*.js"],
  "outputs": ["design/stateHandlerAudit.md", "scripts/auditStateHandlers.mjs"],
  "success": ["complete contract matrix", "gap analysis report", "eslint: PASS"],
  "errorMode": "fail_on_missing_state_definitions"
}
```

**✅ Results Summary**:
- **States analyzed**: 12 (100% coverage)
- **Handler files found**: 12 (100% coverage) 
- **Total contract actions**: 29
- **Implemented**: 14 (48%)
- **Missing**: 15 (52%)
- **Critical gaps**: 4 🚨

**🚨 Priority 1 (Critical) Gaps Identified**:
1. `cooldown` state: `timer:startShortCountdown` - Missing timer logic
2. `roundDecision` state: `compare:selectedStat` - Missing stat comparison
3. `interruptRound` state: `timer:clearIfRunning` - Missing timer cleanup
4. `interruptMatch` state: `timer:clearIfRunning` - Missing timer cleanup

**⚠️ Priority 2 (Important) Gaps**:
- Multiple UI rendering and announcement actions missing
- Score updates and match summary rendering not implemented

**ℹ️ Priority 3 (Nice-to-have) Gaps**:
- Analytics logging and context management actions

**Manual Verification Notes**:
- `cooldownEnter.js` DOES implement timer logic via `initStartCooldown`/`initInterRoundCooldown` - **audit script false positive**
- `roundDecisionEnter.js` DOES implement stat comparison via `resolveSelectionIfPresent` - **audit script false positive**  
- `interruptRoundEnter.js` does NOT implement explicit timer clearing - **true positive**
- Need deeper analysis of implementation patterns vs. contract expectations

**Deliverables**:
- ✅ `/design/stateHandlerAudit.md` - Complete compliance matrix generated
- ✅ `/scripts/auditStateHandlers.mjs` - Reusable audit script created
- ✅ Gap analysis with risk assessment completed
- ✅ Manual verification of critical findings initiated

**Next Steps**: Proceed to Phase 1.2 with focus on verified critical gaps

### Phase 1.2: Critical Gap Resolution ⏱️ _4-6 hours_

**Task Contract**:
```json
{
  "inputs": ["design/stateHandlerAudit.md", "Priority 1 gap list"],
  "outputs": ["Fixed state handlers", "Unit tests", "Integration tests"],
  "success": ["eslint: PASS", "vitest: PASS", "no critical gaps remaining"],
  "errorMode": "rollback_on_breaking_change"
}
```

**Priority 1: Timer & State Logic** ⏱️ _2-3 hours_

**Known Issues to Fix**:
- `waitingForPlayerActionEnter.js`: Add missing `timer:startStatSelection`
- Verify all timer start/stop/clear logic is implemented
- Ensure proper state transition handling

**Implementation Pattern**:
```javascript
// Example fix for missing timer logic
export function waitingForPlayerActionEnter(store, timerService, eventBus) {
  // Existing code...
  
  // ADD: Missing timer start implementation
  timerService.startStatSelectionTimer();
  
  // ADD: Missing event emission
  eventBus.emit('timer:statSelectionStarted');
}
```

**Priority 2: UI & Rendering** ⏱️ _1-2 hours_
- Verify all `render:*` actions are implemented
- Check `announce:*` and `prompt:*` implementations
- Ensure proper UI state updates

**Priority 3: Data & State Management** ⏱️ _1 hour_
- Verify `store:*`, `reset:*`, and `init:*` actions
- Check data consistency requirements

**Testing Strategy**:
```javascript
// Unit test template for each fixed handler
describe('StateHandler: waitingForPlayerActionEnter', () => {
  it('should start stat selection timer on entry', async () => {
    const mockTimer = vi.fn();
    const mockEventBus = { emit: vi.fn() };
    
    await waitingForPlayerActionEnter(store, { startStatSelectionTimer: mockTimer }, mockEventBus);
    
    expect(mockTimer).toHaveBeenCalled();
    expect(mockEventBus.emit).toHaveBeenCalledWith('timer:statSelectionStarted');
  });
});
```

### Phase 1.3: Validation & Testing ⏱️ _2-3 hours_

**Integration Testing**:
- Full battle flow regression testing
- State transition sequence validation
- Timer behavior verification

**Rollback Procedures**:
- Git branch for each handler fix
- Automated rollback on test failures
- Preserve working state for critical path

**Success Criteria**:
- ✅ All Priority 1 gaps resolved
- ✅ Unit tests pass for all modified handlers
- ✅ Integration tests maintain >95% pass rate
- ✅ No console discipline violations
- ✅ State machine contracts fully compliant

---

## 🎯 Phase 2: Event System Standardization

**Objective**: Implement consistent event naming patterns across the battle system

**Risk Assessment**: 🟡 Medium  
- **Risk**: Breaking existing event listeners
- **Mitigation**: Backward compatibility aliases + gradual migration

**Current Event Naming Analysis**:
```
Timer Events:
✅ "roundTimeout" → well-integrated, keep as-is
❓ "control.countdown.started" → internal, needs standardization  
❓ "nextRoundCountdownStarted" → UI-specific, needs grouping

Test Dependencies:
✅ getRoundTimeoutPromise() → "roundTimeout"
❓ getCountdownStartedPromise() → "nextRoundCountdownStarted"
```

### Phase 2.1: Event Naming Audit & Design ⏱️ _2-3 hours_

**Task Contract**:
```json
{
  "inputs": ["src/helpers/classicBattle/**/*.js", "tests/**/*.js"],
  "outputs": ["design/eventNamingAudit.md", "design/eventNamingConvention.md"],
  "success": ["complete event inventory", "naming convention approved"],
  "errorMode": "ask_on_breaking_changes"
}
```

**Step 1: Comprehensive Event Inventory** ⏱️ _1.5 hours_
```bash
# Find all event emissions
rg "emitBattleEvent|eventBus\.emit|emit\(" src/helpers/classicBattle/ > design/eventEmissions.txt

# Find all event listeners  
rg "addEventListener|on\(|setupPromise" src/helpers/classicBattle/ tests/ > design/eventListeners.txt

# Find test event promises
rg "get.*Promise|waitFor.*Event" tests/ playwright/ > design/testEventUsage.txt
```

**Step 2: Event Categorization** ⏱️ _1 hour_
```
Current Events → Proposed Categories:

Timer Events:
- "roundTimeout" → "timer.roundExpired" 
- "statTimeout" → "timer.statSelectionExpired"
- "control.countdown.started" → "timer.countdownStarted"

UI Events:  
- "nextRoundCountdownStarted" → "ui.countdownStarted"
- "statButtons:enable" → "ui.statButtonsEnabled" 
- "cards:revealed" → "ui.cardsRevealed"

Player Events:
- "statSelected" → "player.statSelected"
- "playerInterrupted" → "player.interrupted"

State Events:
- "stateChanged" → "state.transitioned"
- "matchStart" → "state.matchStarted"
```

**Step 3: Convention Documentation** ⏱️ _0.5 hour_
- Document naming patterns and rationale
- Define migration strategy and timeline
- Plan backward compatibility approach

### Phase 2.2: Backward-Compatible Migration ⏱️ _3-4 hours_

**Task Contract**:
```json
{
  "inputs": ["Event inventory", "Naming convention"],
  "outputs": ["Event alias system", "Updated emitters", "Migration plan"],
  "success": ["vitest: PASS", "playwright: PASS", "no breaking changes"],
  "errorMode": "rollback_on_test_failure"
}
```

**Step 1: Event Alias System** ⏱️ _1.5 hours_
```javascript
// /src/helpers/classicBattle/eventAliases.js
const EVENT_ALIASES = {
  // New name → Old names (for backward compatibility)
  'timer.roundExpired': ['roundTimeout'],
  'timer.countdownStarted': ['control.countdown.started', 'nextRoundCountdownStarted'],
  'ui.countdownStarted': ['nextRoundCountdownStarted'],
  'player.statSelected': ['statSelected']
};

export function emitBattleEventWithAliases(eventBus, newEventName, payload) {
  // Emit new event name
  eventBus.emit(newEventName, payload);
  
  // Emit aliases for backward compatibility
  const aliases = EVENT_ALIASES[newEventName] || [];
  aliases.forEach(alias => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Deprecated event '${alias}' used. Update to '${newEventName}'`);
    }
    eventBus.emit(alias, payload);
  });
}
```

**Step 2: Update Event Emitters** ⏱️ _1 hour_
- Replace `emitBattleEvent` calls with new names
- Use alias system to maintain compatibility
- Add deprecation warnings in development

**Step 3: Update Test Helpers** ⏱️ _0.5 hour_
```javascript
// Update promises.js for new event names
export function getRoundExpiredPromise() {
  return setupPromise('timer.roundExpired'); // Updated from 'roundTimeout'
}

// Maintain backward compatibility during migration
export function getRoundTimeoutPromise() {
  console.warn('getRoundTimeoutPromise is deprecated. Use getRoundExpiredPromise.');
  return getRoundExpiredPromise();
}
```

### Phase 2.3: Migration Validation ⏱️ _1-2 hours_

**Testing Strategy**:
- Run full test suite with aliases enabled
- Verify no event listeners are broken
- Test both old and new event names work
- Validate deprecation warnings appear correctly

**Success Criteria**:
- ✅ All tests pass with new event names
- ✅ Backward compatibility maintained
- ✅ Event naming follows consistent patterns
- ✅ Migration path documented
- ✅ No breaking changes to public API

---

## 🎯 Phase 3: Debug Infrastructure Implementation

**Objective**: Add structured logging system for battle state debugging without violating console discipline

**Risk Assessment**: 🟢 Low
- **Low Risk**: Additive feature, doesn't modify core logic
- **High Value**: Significantly improves debugging capabilities

### Phase 3.1: Debug Logger Architecture ⏱️ _3-4 hours_

**Task Contract**:
```json
{
  "inputs": ["Console discipline requirements", "Test environment constraints"],
  "outputs": ["src/helpers/classicBattle/debugLogger.js", "Debug configuration system"],
  "success": ["eslint: PASS", "vitest: PASS", "no console violations"],
  "errorMode": "fail_on_test_console_pollution"
}
```

**Step 1: Core Logger Implementation** ⏱️ _2 hours_
```javascript
// /src/helpers/classicBattle/debugLogger.js

/**
 * Structured battle debug logger that respects console discipline
 * @pseudocode
 * 1. Create logger with configurable categories and outputs
 * 2. Buffer logs in memory for test environments 
 * 3. Output to console only in development with explicit flags
 * 4. Provide structured log querying and filtering
 */
export class BattleDebugLogger {
  constructor(options = {}) {
    this.enabled = this.shouldEnable(options);
    this.categories = new Set(options.categories || ['state', 'event', 'timer']);
    this.outputMode = this.getOutputMode(options);
    this.buffer = []; // Memory buffer for all environments
    this.maxBufferSize = options.maxBufferSize || 1000;
  }

  shouldEnable(options) {
    // Enable via environment variable or explicit option
    return options.enabled || 
           process.env.DEBUG_BATTLE || 
           (typeof window !== 'undefined' && window.location.search.includes('debugBattle'));
  }

  getOutputMode(options) {
    if (process.env.VITEST) return 'memory'; // Never console in tests
    if (process.env.NODE_ENV === 'production') return 'memory';
    return options.outputMode || 'console';
  }

  log(category, level, message, data = {}) {
    if (!this.enabled || !this.categories.has(category)) return;

    const entry = {
      timestamp: Date.now(),
      category,
      level,
      message,
      data: this.sanitizeData(data)
    };

    this.addToBuffer(entry);

    if (this.outputMode === 'console') {
      this.outputToConsole(entry);
    }
  }
}
```

**Step 2: Integration Interfaces** ⏱️ _1 hour_
```javascript
// Logger methods for different battle components
export const debugLogger = new BattleDebugLogger({
  categories: ['state', 'event', 'timer', 'error']
});

// State machine integration
export function logStateTransition(from, to, trigger) {
  debugLogger.log('state', 'info', `Transition: ${from} → ${to}`, { trigger });
}

// Event system integration  
export function logEventEmit(eventName, payload) {
  debugLogger.log('event', 'info', `Emit: ${eventName}`, { payload });
}

// Timer integration
export function logTimerStart(name, duration) {
  debugLogger.log('timer', 'info', `Timer started: ${name}`, { duration });
}
```

### Phase 3.2: Battle System Integration ⏱️ _2-3 hours_

**Task Contract**:
```json
{
  "inputs": ["debugLogger.js", "State handlers", "Event system", "Timer service"],
  "outputs": ["Instrumented battle components", "Debug activation system"],  
  "success": ["No performance impact", "Clean test output", "Useful debug info"],
  "errorMode": "rollback_on_performance_degradation"
}
```

**Step 1: State Handler Integration** ⏱️ _1 hour_
```javascript
// Example integration in state handlers
import { logStateTransition } from '../debugLogger.js';

export function waitingForPlayerActionEnter(store, timerService, eventBus) {
  logStateTransition(store.previousState, 'waitingForPlayerAction', 'playerAction');
  
  // Existing implementation...
  timerService.startStatSelectionTimer();
  
  logTimerStart('statSelection', store.config.statSelectionTime);
}
```

**Step 2: Event System Integration** ⏱️ _0.5 hour_
- Add logging to event emitters and listeners
- Track event flow and timing
- Log event payload sanitization

**Step 3: Runtime Activation** ⏱️ _0.5 hour_
```javascript
// URL parameter activation: ?debugBattle=state,timer
// Environment variable: DEBUG_BATTLE=all
// Settings panel toggle (development only)
```

### Phase 3.3: Debug Tooling & Validation ⏱️ _1-2 hours_

**Debug Query Interface**:
```javascript
// Test-friendly log querying
const logs = debugLogger.getLogsForCategory('state');
const transitions = debugLogger.getStateTransitions();
const timerEvents = debugLogger.getTimerEvents();

// Export debug session for issue reporting
const debugExport = debugLogger.exportSession();
```

**Performance Validation**:
- Measure logging overhead in production mode (should be ~0)
- Verify memory buffer doesn't leak
- Test garbage collection behavior

**Testing Integration**:
```javascript
// Use debug logs for test assertions
describe('State transitions', () => {
  beforeEach(() => {
    debugLogger.clearBuffer();
  });

  it('should log state transitions correctly', () => {
    // ... trigger state change ...
    const transitions = debugLogger.getStateTransitions();
    expect(transitions).toContainEqual({
      from: 'waitingForPlayerAction',
      to: 'roundDecision',
      trigger: 'statSelected'
    });
  });
});
```

**Success Criteria**:
- ✅ Debug logging available in development
- ✅ No console pollution in tests (console discipline maintained)
- ✅ Structured logs useful for debugging
- ✅ Zero performance impact in production
- ✅ Memory-efficient buffering system

---

## 📊 Implementation Timeline & Risk Management

### **Execution Schedule**

**Week 1**: Phase 1 - State Handler Audit
- Days 1-2: Contract mapping and audit script development
- Days 3-4: Critical gap resolution and testing
- Day 5: Integration testing and documentation

**Week 2**: Phase 2 - Event System Standardization  
- Days 1-2: Event inventory and naming convention design
- Days 3-4: Migration implementation with backward compatibility
- Day 5: Validation testing and deprecation planning

**Week 3**: Phase 3 - Debug Infrastructure
- Days 1-2: Logger architecture and core implementation
- Days 3-4: Battle system integration and activation modes
- Day 5: Performance validation and tooling

### **Risk Management Matrix**

| Phase | Risk Level | Primary Risks | Mitigation Strategy |
|-------|------------|---------------|-------------------|
| Phase 1 | 🟡 Medium | State handler bugs breaking battle flow | Comprehensive testing, rollback procedures |
| Phase 2 | 🟡 Medium | Breaking existing event listeners | Backward compatibility aliases, gradual migration |
| Phase 3 | 🟢 Low | Performance impact, console discipline violations | Memory-only mode for tests, performance monitoring |

### **Success Metrics & Validation**

**Phase 1 Success Criteria**:
- ✅ All 14 state handlers implement required contracts
- ✅ Critical timer and state logic gaps resolved
- ✅ Unit test coverage for all modified handlers
- ✅ Integration test pass rate maintained >95%

**Phase 2 Success Criteria**:
- ✅ Consistent event naming convention adopted
- ✅ Backward compatibility maintained during migration
- ✅ Test helpers updated with deprecation warnings
- ✅ Event flow documentation updated

**Phase 3 Success Criteria**:
- ✅ Debug logging system operational without console violations
- ✅ Structured logging available for battle debugging  
- ✅ Zero performance impact in production mode
- ✅ Test-friendly log querying capabilities

### **Rollback Procedures**

**Phase 1**: Individual state handler rollback via feature branches
**Phase 2**: Event alias system allows instant rollback to old names
**Phase 3**: Debug logger is additive - can be disabled without impact

**Overall Project Risk**: 🟡 Medium
**Estimated Total Effort**: 18-24 hours
**Expected Timeline**: 3 weeks (part-time implementation)
