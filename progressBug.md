# Technical Debt 

#### 3.1 State Handler Audit: Contract Compliance Review
**Objective**: Ensure all state handlers implement their documented contracts from `stateTable.js`

**Scope Analysis**:
- 14 state handlers identified in `/src/helpers/classicBattle/stateHandlers/`
- Each state in `stateTable.js` defines `onEnter` actions that must be implemented
- Previous analysis found `waitingForPlayerActionEnter.js` was missing `timer:startStatSelection`

**Implementation Plan**:

**Phase 3.1.1: Contract Mapping & Gap Analysis** ⏱️ *2-3 hours*
1. **Extract State Contracts**: Parse `stateTable.js` to build a complete contract matrix
   ```bash
   # Create audit script to map state contracts
   node scripts/auditStateHandlers.mjs > design/stateHandlerAudit.md
   ```
   
2. **Handler Implementation Analysis**: Check each handler against its contract
   - States to audit: `waitingForMatchStart`, `matchStart`, `cooldown`, `roundStart`, `roundDecision`, `roundOver`, `matchDecision`, `matchOver`, `interruptRound`, `interruptMatch`, `roundModification`
   - Contract actions to verify: `timer:*`, `render:*`, `init:*`, `store:*`, `reset:*`, `prompt:*`, `announce:*`, etc.

3. **Gap Identification**: Document missing implementations
   - Expected deliverable: `/design/stateHandlerAudit.md` with compliance matrix

**Phase 3.1.2: Implementation Fixes** ⏱️ *4-6 hours*
1. **Priority 1 - Timer-Related**: Fix any missing timer logic (highest risk)
2. **Priority 2 - UI/Rendering**: Implement missing render/announce actions
3. **Priority 3 - Data/State**: Add missing init/store/reset actions

**Testing Strategy**:
- Unit test each fixed handler in isolation
- Integration tests to verify state transitions work end-to-end
- Regression testing on existing battle flows

---

#### 3.2 Event System Cleanup: Standardize Event Naming
**Objective**: Reduce confusion and maintenance burden from inconsistent event naming

**Current Event Name Analysis**:
```
Timer Events:
- ✅ "roundTimeout" (timerService.js) → standard, well-integrated
- ❓ "control.countdown.started" (cooldowns.js, roundManager.js) → internal control events
- ❓ "nextRoundCountdownStarted" (CooldownRenderer.js) → UI countdown events

Concerns:
- Tests use getRoundTimeoutPromise() → "roundTimeout" ✅
- Tests use getCountdownStartedPromise() → "nextRoundCountdownStarted" ❓
- Internal countdown logic uses "control.countdown.started" ❓
```

**Implementation Plan**:

**Phase 3.2.1: Event Naming Audit** ⏱️ *1-2 hours*
1. **Event Inventory**: Map all battle events and their usage
   ```bash
   # Find all emitBattleEvent calls
   grep -r "emitBattleEvent" src/helpers/classicBattle/ > design/eventInventory.txt
   
   # Find all event listeners in promises.js and tests
   grep -r "setupPromise\|addEventListener" src/helpers/classicBattle/ tests/ >> design/eventInventory.txt
   ```

2. **Categorize Events**: Group by purpose (timer, UI, control, state)
   - Timer events: `roundTimeout`, `statTimeout`, `countdownExpired`
   - UI events: `nextRoundCountdownStarted`, `statButtons:enable`, `cards:revealed` 
   - Control events: `control.countdown.started`, `control.*`
   - State events: `statSelected`, `cardsRevealed`, `matchStart`

**Phase 3.2.2: Naming Convention Design** ⏱️ *1 hour*
Design consistent naming patterns:
```
Proposed Convention:
- timer.* : Timer-related events (timer.roundExpired, timer.countdownStarted)
- ui.* : User interface events (ui.countdownStarted, ui.cardsRevealed)  
- control.* : Internal state machine events (control.stateChanged)
- player.* : Player action events (player.statSelected, player.interrupted)
```

**Phase 3.2.3: Migration Implementation** ⏱️ *3-4 hours*
1. **Backward Compatibility**: Create event aliases during migration
2. **Update Emitters**: Change emitBattleEvent calls to use new names
3. **Update Listeners**: Update promises.js and test helpers
4. **Deprecation Path**: Add console warnings for old event names

**Risk Mitigation**:
- Implement aliases to maintain backward compatibility
- Gradual rollout with feature flag control
- Comprehensive integration testing before removing old names

---

#### 3.3 Debug Infrastructure: Structured State Machine Logging
**Objective**: Enable debugging without violating console discipline or breaking test output

**Current Debugging Challenges**:
- Console output is muted in tests via `process.env.VITEST` guards
- Agent instructions enforce "no unsuppressed console logs"
- State machine debugging requires visibility into transitions, events, and timers
- Manual debugging is difficult during test failures

**Implementation Plan**:

**Phase 3.3.1: Logging Infrastructure Design** ⏱️ *2-3 hours*
1. **Debug Logger Service**: Create structured logging system
   ```javascript
   // /src/helpers/classicBattle/debugLogger.js
   export class BattleDebugLogger {
     constructor(options = {}) {
       this.enabled = options.enabled || false;
       this.categories = options.categories || ['state', 'event', 'timer'];
       this.output = options.output || 'console'; // 'console', 'dom', 'memory'
     }
   }
   ```

2. **Logging Categories**:
   - `state`: State transitions, handler entry/exit
   - `event`: Event emissions and handling  
   - `timer`: Timer start/stop/expire events
   - `error`: Error conditions and recovery
   - `test`: Test-specific debugging information

**Phase 3.3.2: Integration Points** ⏱️ *3-4 hours*
1. **State Machine Integration**: Add logging to state transitions
   ```javascript
   // In state handlers:
   debugLogger.logStateTransition(fromState, toState, trigger);
   debugLogger.logStateEnter(stateName, onEnterActions);
   ```

2. **Event System Integration**: Log event flow
   ```javascript
   // In event emitter:
   debugLogger.logEventEmit(eventName, payload);
   // In event handlers:
   debugLogger.logEventReceive(eventName, handlerName);
   ```

3. **Timer Integration**: Track timer lifecycle
   ```javascript
   // In timerService.js:
   debugLogger.logTimerStart(timerName, duration);
   debugLogger.logTimerExpire(timerName);
   ```

**Phase 3.3.3: Debug Activation Modes** ⏱️ *1-2 hours*
1. **Environment-Based**: Enable via environment variables
   ```bash
   DEBUG_BATTLE=state,event,timer npm test
   DEBUG_BATTLE=all npm run dev
   ```

2. **Runtime Toggle**: Enable/disable via settings panel or URL parameters
   ```javascript
   // URL: ?debugBattle=state,timer
   // Settings: Advanced → Battle Debug → Enable State Logging
   ```

3. **Test-Specific**: Enable for specific tests without console pollution
   ```javascript
   // Store logs in memory for assertion
   const logs = debugLogger.getLogsForTest();
   expect(logs).toContain('state.transition: waitingForPlayerAction → roundDecision');
   ```

**Phase 3.3.4: Output Formats** ⏱️ *1-2 hours*
1. **Console Output**: Structured console logs (development only)
2. **DOM Output**: Debug panel in UI (development/staging)
3. **Memory Buffer**: Capture logs for test assertions
4. **Export/Download**: Debug session export for issue reporting

**Integration Testing Strategy**:
- Verify logging doesn't impact performance in production
- Test log capture in both passing and failing test scenarios  
- Validate memory usage with extensive logging enabled
- Ensure proper cleanup and garbage collection

---

#### **Phase 3 Implementation Timeline**

**Week 1**: State Handler Audit (3.1)
- Days 1-2: Contract mapping and gap analysis
- Days 3-5: Priority fixes and testing

**Week 2**: Event System Cleanup (3.2)  
- Days 1-2: Event inventory and naming convention design
- Days 3-5: Migration implementation and testing

**Week 3**: Debug Infrastructure (3.3)
- Days 1-2: Logger design and infrastructure
- Days 3-4: Integration points implementation  
- Day 5: Testing and documentation

**Estimated Total Effort**: 15-20 hours across 3 weeks

**Success Metrics**:
- ✅ All state handlers implement their documented contracts
- ✅ Event naming follows consistent patterns
- ✅ Debug logging available without breaking test discipline
- ✅ No regressions in existing functionality
- ✅ Test suite maintains >95% pass rate throughout

---

