# Classic Battle Helper Tests

This directory contains unit tests for Classic Battle helpers.

## Suite Overview

- `battleStateBadge.test.js`: renders and updates the battle state progress badge.
- `cardSelection.test.js`: loads cards and handles stat selection UI.
- `controlState.test.js`: battle control state toggles (Next/quit buttons and home link).
- `difficulty.test.js`: chooses opponent stats based on difficulty.
- `interruptFlow.test.js`: exercises interrupt paths in the state machine.
- `interruptHandlers.test.js`: handles browser event interrupts (`pagehide`, `error`, `unhandledrejection`).
- `matchEnd.test.js`: finishes the match and shows the summary modal.
- `opponentDelay.test.js`: shows snackbar feedback during opponent delays.
- `scheduleNextRound.test.js`: schedules and auto-dispatches the next round.
- `statButtons.state.test.js`: toggles stat buttons based on battle state.
- `statSelection.test.js`: resolves round outcomes and match-end logic. Outcome message and score checks use a table-driven `describe.each`.
- `statSelectionTiming.test.js`: stat selection timing behaviors (auto-select, countdown resets, stall recovery, pause/resume).
- `stateTransitions.test.js`: validates `src/helpers/classicBattle/stateTable.js` transitions using the production `createStateManager` state table and hooks.
- `timerService.drift.test.js`: falls back to messaging when timers drift.
- `timerService.nextRound.test.js`: manages cooldown and Next button interaction.
- `nextButton.countdownFinished.test.js`: emits `countdownFinished` on Next clicks, even without the button.
- `timerStateExposure.test.js`: exposes timer state to window and DOM.
- `commonMocks.js`: scheduler and motion utility mocks shared across suites.
- `setupTestEnv.js`: exposes `setupClassicBattleHooks()` to wire DOM and mocks.
- `mockSetup.js`: shared mock helper to reduce duplication.
- `utils.js` / `mocks.js`: shared DOM setup and legacy mocks for these suites.
- `playRounds.js`: loops identical stat selections for multi-round tests.

## Guidelines

- One behavior per test.
- Use parameterized tests (e.g., `it.each`) to cover related behaviors with different inputs, such as cancel actions for the quit modal.
- Prefer shared helpers in `domUtils.js`, `utils/testUtils.js`, `commonMocks.js`, and `setupTestEnv.js`; new tests should rely on these instead of duplicating mocks or manual DOM setup.
- Do not commit `it.skip`; use `test.todo` or remove obsolete tests instead.
- Timer drift, state exposure, and Next button behavior belong in `timerService` tests; cooldown tests cover scheduling and ready dispatch.
- Avoid duplicating coverage across suites. Interrupt behavior triggered by browser events (such as `pagehide`, global `error`, or `unhandledrejection`) is covered exclusively in `interruptHandlers.test.js`.
- When verifying new state-machine behavior, extend `stateTransitions.test.js` or targeted suites such as `interruptFlow.test.js`. These suites already construct focused state tables via `createStateManager`, so ad-hoc temporary suites with simplified tables should be retired once the production tests cover the scenario.

### Usage

```js
import "./commonMocks.js";
import { setupClassicBattleHooks } from "./setupTestEnv.js";

const getEnv = setupClassicBattleHooks();
```

`commonMocks.js` and `setupTestEnv.js` provide shared mocks and DOM wiring—new tests should import them instead of duplicating setup.

### Helpers

Use `playRounds(selectStat, times)` from `playRounds.js` when a suite requires repeating the same stat selection multiple times.
