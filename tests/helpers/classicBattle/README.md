# Classic Battle Helper Tests

This directory contains unit tests for Classic Battle helpers.

## Suite Overview

- `battleStateBadge.test.js`: renders and updates the battle state progress badge.
- `cardSelection.test.js`: loads cards and handles stat selection UI.
- `classicBattlePage.import.test.js`: verifies `classicBattlePage.js` exports.
- `countdownReset.test.js`: clears the round timer after a stat is chosen.
- `difficulty.test.js`: chooses opponent stats based on difficulty.
- `interruptFlow.test.js`: exercises interrupt paths in the state machine.
- `interruptHandlers.test.js`: handles browser event interrupts (`pagehide`, `error`, `unhandledrejection`).
- `matchControls.test.js`: toggles Next/quit controls and home link behavior.
- `matchEnd.test.js`: finishes the match and shows the summary modal.
- `opponentDelay.test.js`: shows snackbar feedback during opponent delays.
- `pauseTimer.test.js`: pauses and resumes the round timer.
- `playerChoiceReset.test.js`: clears previous player choices on new rounds.
- `quitModal.test.js`: confirms quitting via a modal dialog.
- `roundSelectModal.test.js`: selects points-to-win via a modal.
- `roundResolverOnce.test.js`: clears `playerChoice` after fallback resolution.
- `roundStartError.test.js`: surfaces round start failures.
- `scheduleNextRound.test.js`: schedules and auto-dispatches the next round.
- `statSelectionTiming.test.js`: handles stat auto-select and selection prompts based on timing.
- `stallRecovery.test.js`: recovers when stat selection stalls.
- `statButtons.state.test.js`: toggles stat buttons based on battle state.
- `statSelection.test.js`: resolves round outcomes after stat selection.
- `stateTransitions.test.js`: validates `src/helpers/classicBattle/stateTable.js` transitions.
- `timerService.drift.test.js`: falls back to messaging when timers drift.
- `timerService.nextRound.test.js`: manages cooldown and Next button interaction.
- `skipRoundCooldown.test.js`: skips the inter-round countdown when the feature flag is enabled.
- `timerStateExposure.test.js`: exposes timer state to window and DOM.
- `commonMocks.js`: scheduler and motion utility mocks shared across suites.
- `setupTestEnv.js`: exposes `setupClassicBattleHooks()` to wire DOM and mocks.
- `mockSetup.js`: shared mock helper to reduce duplication.
- `utils.js` / `mocks.js`: shared DOM setup and legacy mocks for these suites.

## Guidelines

- One behavior per test.
- Prefer shared helpers in `domUtils.js`, `utils/testUtils.js`, `commonMocks.js`, and `setupTestEnv.js`.
- Do not commit `it.skip`; use `test.todo` or remove obsolete tests instead.
- Timer drift, state exposure, and Next button behavior belong in `timerService` tests; `scheduleNextRound` tests cover cooldown scheduling and ready dispatch.
- Avoid duplicating coverage across suites. Interrupt behavior triggered by browser events (such as `pagehide`, global `error`, or `unhandledrejection`) is covered exclusively in `interruptHandlers.test.js`.

### Usage

```js
import "./commonMocks.js";
import { setupClassicBattleHooks } from "./setupTestEnv.js";

const getEnv = setupClassicBattleHooks();
```

New tests should rely on these helpers rather than duplicating mocks or manual DOM setup.
