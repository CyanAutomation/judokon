# Event System Audit Report
Generated: 2025-09-10T13:18:40.632Z

## Summary

- **Events emitted**: 84
- **Event listeners**: 83
- **Test event patterns**: 7

## Event Categories

### Timer Events (22)

- `control.countdown.completed`
- `control.countdown.started`
- `cooldown.timer.expired`
- `cooldown.timer.tick`
- `countdownFinished`
- `countdownStart`
- `nextRoundTimerReady`
- `round.timer.expired`
- `round.timer.tick`
- `roundTimeout`

### Ui Events (6)

- `control.readiness.required`
- `opponentCardReady`
- `statButtons:disable`
- `statButtons:enable`

### State Events (20)

- `battleStateChange`
- `control.state.catalog`
- `control.state.changed`
- `debug.state.snapshot`
- `match.concluded`
- `matchOver`
- `round.evaluated`
- `round.selection.locked`
- `round.started`
- `roundOptionsReady`
- `roundPrompt`
- `roundResolved`
- `roundStarted`

### Player Events (3)

- `statSelected`
- `statSelectionStalled`

### Scoreboard Events (11)

- `scoreboardClearMessage`
- `scoreboardShowMessage`

### Debug Events (13)

- `debug.transition`
- `debugPanelUpdate`

### Control Events (1)

- `control.readiness.confirmed`

### Uncategorized Events (8)

- `display.score.update`
- `input.ignored`
- `interrupt.requested`
- `interrupt.resolved`
- `opponentReveal`
- `startClicked`

## Current Event Names Analysis

**All unique event names currently in use:**
```
"battleStateChange"
"control.countdown.completed"
"control.countdown.started"
"control.readiness.confirmed"
"control.readiness.required"
"control.state.catalog"
"control.state.changed"
"cooldown.timer.expired"
"cooldown.timer.tick"
"countdownFinished"
"countdownStart"
"debug.state.snapshot"
"debug.transition"
"debugPanelUpdate"
"display.score.update"
"input.ignored"
"interrupt.requested"
"interrupt.resolved"
"match.concluded"
"matchOver"
"nextRoundTimerReady"
"opponentCardReady"
"opponentReveal"
"round.evaluated"
"round.selection.locked"
"round.started"
"round.timer.expired"
"round.timer.tick"
"roundOptionsReady"
"roundPrompt"
"roundResolved"
"roundStarted"
"roundTimeout"
"scoreboardClearMessage"
"scoreboardShowMessage"
"startClicked"
"statButtons:disable"
"statButtons:enable"
"statSelected"
"statSelectionStalled"
```

## Recommended Naming Convention

### Proposed Structure

**timer.***: timer.roundExpired, timer.countdownStarted, timer.statSelectionExpired, timer.cooldownFinished
**ui.***: ui.statButtonsEnabled, ui.statButtonsDisabled, ui.cardsRevealed, ui.countdownStarted
**state.***: state.transitioned, state.matchStarted, state.roundStarted, state.matchOver
**player.***: player.statSelected, player.interrupted, player.actionTimeout
**scoreboard.***: scoreboard.messageShown, scoreboard.messageCleared, scoreboard.scoreUpdated
**debug.***: debug.panelUpdated, debug.stateExposed

## Migration Mapping

### High-Priority Migrations

| Current Name | Proposed Name | Category | Priority |
|--------------|---------------|----------|----------|
| `roundTimeout` | `timer.roundExpired` | timer | High |
| `statButtons:enable` | `ui.statButtonsEnabled` | ui | Medium |
| `statButtons:disable` | `ui.statButtonsDisabled` | ui | Medium |
| `scoreboardShowMessage` | `scoreboard.messageShown` | scoreboard | Medium |
| `scoreboardClearMessage` | `scoreboard.messageCleared` | scoreboard | Medium |
| `debugPanelUpdate` | `debug.panelUpdated` | debug | Medium |
| `matchOver` | `state.matchOver` | state | High |
| `statSelected` | `player.statSelected` | player | Medium |

## Test Integration Points

**Test helper functions that need updating:**
- `getCountdownStartedPromise`
- `getEscapeHandledPromise`
- `getRoundTimeoutPromise`
- `waitForNextRoundReadyEvent`

## Implementation Recommendations

1. **Implement backward-compatible alias system** to avoid breaking changes
2. **Update emitters gradually** using feature flags
3. **Create migration timeline** with deprecation warnings
4. **Update test helpers** to use new event names with backward compatibility
5. **Document event contracts** for future consistency
