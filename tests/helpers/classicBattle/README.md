# Classic Battle Helper Tests

This directory contains unit tests for Classic Battle helpers.

## Suite Overview

- `autoSelect.test.js`: auto-selects a stat when the timer expires.
- `battleStateBadge.test.js`: renders and updates the battle state progress badge.
- `cardSelection.test.js`: loads cards and handles stat selection UI.
- `classicBattlePage.import.test.js`: verifies `classicBattlePage.js` exports.
- `countdownReset.test.js`: clears the round timer after a stat is chosen.
- `difficulty.test.js`: chooses opponent stats based on difficulty.
- `interrupt.test.js`: dispatches interrupt events when random stat mode is off.
- `interruptFlow.test.js`: exercises interrupt paths in the state machine.
- `interruptHandlers.test.js`: handles browser event interrupts (`pagehide`, `error`, `unhandledrejection`).
- `matchControls.test.js`: toggles Next/quit controls and home link behavior.
- `matchEnd.test.js`: finishes the match and shows the summary modal.
- `opponentDelay.test.js`: shows snackbar feedback during opponent delays.
- `pauseTimer.test.js`: pauses and resumes the round timer.
- `quitModal.test.js`: confirms quitting via a modal dialog.
- `roundSelectModal.test.js`: selects points-to-win via a modal.
- `scheduleNextRound.test.js`: schedules and auto-dispatches the next round.
- `selectionPrompt.test.js`: displays the selection prompt until a stat is chosen.
- `stallRecovery.test.js`: recovers when stat selection stalls.
- `statSelection.test.js`: resolves round outcomes after stat selection.
- `stateTransitions.test.js`: validates `classicBattleStates.json` transitions.
- `timerService.drift.test.js`: falls back to messaging when timers drift.
- `timerService.nextRound.test.js`: manages cooldown and Next button interaction.
- `timerStateExposure.test.js`: exposes timer state to window and DOM.
- `utils.js` / `mocks.js`: shared DOM setup and mocks for these suites.

## Guidelines

- One behavior per test.
- Prefer shared helpers in `domUtils.js` and `utils/testUtils.js`.
- Avoid duplicating coverage across suites. Interrupt behavior triggered by browser events (such as `pagehide`, global `error`, or `unhandledrejection`) is covered exclusively in `interruptHandlers.test.js`.
