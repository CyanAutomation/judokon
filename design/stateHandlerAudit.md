# State Handler Contract Compliance Audit
Generated: 2025-09-10T13:07:28.329Z

## Summary

- **States in contract**: 12
- **Handler files found**: 12

## Detailed Analysis

### waitingForMatchStart
**ID**: 1 | **Type**: initial
**Description**: Idle state before the match begins. UI shows Start/Ready and win target selection (5, 10, or 15).

**Required onEnter actions**: 2
```
- render:matchLobby
- reset:scoresAndUI
```

**Implementation Status**: Fully compliant
**✅ Implemented (2)**: render:matchLobby, reset:scoresAndUI
**Handler file**: `waitingForMatchStartEnter.js`

---

### matchStart
**ID**: 2 | **Type**: normal
**Description**: Initialises match context. Stores selected win target, resets scores, and fixes user as first player for all rounds.

**Required onEnter actions**: 4
```
- init:matchContext
- store:winTargetSelection
- reset:scores
- set:firstPlayerUser
```

**Implementation Status**: Fully compliant
**✅ Implemented (4)**: init:matchContext, store:winTargetSelection, reset:scores, set:firstPlayerUser
**Handler file**: `matchStartEnter.js`

---

### cooldown
**ID**: 7 | **Type**: normal
**Description**: Short pacing pause before the first round and between rounds; allows animations and readability.

**Required onEnter actions**: 2
```
- timer:startShortCountdown
- announce:nextRoundInUI
```

**Implementation Status**: No implementation found
**❌ Missing (2)**: timer:startShortCountdown, announce:nextRoundInUI
**🚨 Priority 1 (Critical)**: timer:startShortCountdown
**⚠️ Priority 2 (Important)**: announce:nextRoundInUI
**Handler file**: `cooldownEnter.js`

---

### roundStart
**ID**: 3 | **Type**: normal
**Description**: Begins a new round. Randomly draws judoka for user and opponent, reveals both, user is the active chooser.

**Required onEnter actions**: 3
```
- draw:randomJudokaBothSides
- reveal:roundCards
- set:activePlayerUser
```

**Implementation Status**: Fully compliant
**✅ Implemented (3)**: draw:randomJudokaBothSides, reveal:roundCards, set:activePlayerUser
**Handler file**: `roundStartEnter.js`

---

### waitingForPlayerAction
**ID**: 4 | **Type**: normal
**Description**: Awaiting the user's stat choice. If no action within the round timer, optional auto-select may fire.

**Required onEnter actions**: 3
```
- prompt:chooseStat
- timer:startStatSelection
- a11y:exposeTimerStatus
```

**Implementation Status**: Fully compliant
**✅ Implemented (3)**: prompt:chooseStat, timer:startStatSelection, a11y:exposeTimerStatus
**Handler file**: `waitingForPlayerActionEnter.js`

---

### roundDecision
**ID**: 5 | **Type**: normal
**Description**: Compares the selected stat and determines the round outcome.

**Required onEnter actions**: 3
```
- compare:selectedStat
- compute:roundOutcome
- announce:roundOutcome
```

**Implementation Status**: Partially implemented
**✅ Implemented (1)**: announce:roundOutcome
**❌ Missing (2)**: compare:selectedStat, compute:roundOutcome
**🚨 Priority 1 (Critical)**: compare:selectedStat
**ℹ️ Priority 3 (Nice-to-have)**: compute:roundOutcome
**Handler file**: `roundDecisionEnter.js`

---

### roundOver
**ID**: 6 | **Type**: normal
**Description**: Updates scores and presents a brief summary. No card transfers occur.

**Required onEnter actions**: 2
```
- update:score
- update:UIRoundSummary
```

**Implementation Status**: No implementation found
**❌ Missing (2)**: update:score, update:UIRoundSummary
**⚠️ Priority 2 (Important)**: update:score, update:UIRoundSummary
**Handler file**: `roundOverEnter.js`

---

### matchDecision
**ID**: 8 | **Type**: normal
**Description**: Determines the overall winner once a player reaches the selected win target.

**Required onEnter actions**: 2
```
- compute:matchOutcome
- render:matchSummary
```

**Implementation Status**: No implementation found
**❌ Missing (2)**: compute:matchOutcome, render:matchSummary
**⚠️ Priority 2 (Important)**: render:matchSummary
**ℹ️ Priority 3 (Nice-to-have)**: compute:matchOutcome
**Handler file**: `matchDecisionEnter.js`

---

### matchOver
**ID**: 9 | **Type**: final
**Description**: Match completed. Offer Rematch or Home. Final score remains visible.

**Required onEnter actions**: 1
```
- show:matchResultScreen
```

**Implementation Status**: No implementation found
**❌ Missing (1)**: show:matchResultScreen
**⚠️ Priority 2 (Important)**: show:matchResultScreen
**Handler file**: `matchOverEnter.js`

---

### interruptRound
**ID**: 98 | **Type**: normal
**Description**: Round-level interruption (quit, navigation, or error). Performs safe rollback and offers options.

**Required onEnter actions**: 3
```
- timer:clearIfRunning
- rollback:roundContextIfNeeded
- log:analyticsInterruptRound
```

**Implementation Status**: No implementation found
**❌ Missing (3)**: timer:clearIfRunning, rollback:roundContextIfNeeded, log:analyticsInterruptRound
**🚨 Priority 1 (Critical)**: timer:clearIfRunning
**ℹ️ Priority 3 (Nice-to-have)**: rollback:roundContextIfNeeded, log:analyticsInterruptRound
**Handler file**: `interruptRoundEnter.js`

---

### roundModification
**ID**: 97 | **Type**: normal
**Description**: Admin/test-only branch to adjust round decision parameters before re-evaluating.

**Required onEnter actions**: 1
```
- open:roundModificationPanel
```

**Implementation Status**: Fully compliant
**✅ Implemented (1)**: open:roundModificationPanel
**Handler file**: `roundModificationEnter.js`

---

### interruptMatch
**ID**: 99 | **Type**: normal
**Description**: Match-level interruption from setup or critical error. Cleans up context and returns to lobby on request.

**Required onEnter actions**: 3
```
- timer:clearIfRunning
- teardown:matchContext
- log:analyticsInterruptMatch
```

**Implementation Status**: No implementation found
**❌ Missing (3)**: timer:clearIfRunning, teardown:matchContext, log:analyticsInterruptMatch
**🚨 Priority 1 (Critical)**: timer:clearIfRunning
**ℹ️ Priority 3 (Nice-to-have)**: teardown:matchContext, log:analyticsInterruptMatch
**Handler file**: `interruptMatchEnter.js`

---

## Compliance Summary

- **Total contract actions**: 29
- **Implemented**: 14 (48%)
- **Missing**: 15 (52%)
- **Critical gaps**: 4

🚨 **Critical gaps found!** These should be addressed first as they may break battle flow.

## Recommendations

1. **Address Priority 1 gaps first** - these can break core battle functionality
2. **Verify implementation patterns** - some actions may be implemented but not detected by this audit
3. **Add unit tests** for any modified handlers
4. **Run integration tests** after fixes to ensure no regressions
