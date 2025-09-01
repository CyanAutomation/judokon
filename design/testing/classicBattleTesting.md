# Classic Battle Testing Notes

This note explains how Classic Battle bindings and promises are set up for tests and how to (re)bind after mocks in Vitest.

## Helpers

- `tests/helpers/initClassicBattleTest.js` exports:
  - `initClassicBattleTest({ afterMock } = {})`
    - When `afterMock` is true:
      - Calls `__resetClassicBattleBindings()` to clear promise-bound state.
      - Calls `__ensureClassicBattleBindings({ force: true })` to reset the event bus and bind dynamic handlers that honor vi.mocks.
    - Returns the `src/helpers/classicBattle.js` module (battle API and test hooks).

## Event Binding Policy in Tests

- Runtime modules bind listeners at import time, which can race with `vi.mock`.
- For tests, Classic Battle exposes:
  - `__ensureClassicBattleBindings({ force })`: idempotent; when `force`d, resets the event bus and rebinds dynamic handlers (round UI and UI helpers) so mocks applied inside a test are respected.
  - `resetBattlePromises()` under `promises.js` is invoked to guarantee fresh awaitables.

## When to call `initClassicBattleTest({ afterMock: true })`

- Immediately after using `vi.doMock(...)` inside a test body that affects any Classic Battle module or UI dependency (e.g., `uiHelpers`, `timerService`, `orchestrator.dispatchBattleEvent`).
- Top-level `vi.mock(...)` usually doesn’t need a rebind.

## Preferred Synchronization Signals

- Avoid raw sleeps or broad timer flushes. Prefer these event promises from `src/helpers/classicBattle/promises.js`:
  - `getRoundPromptPromise()` → selection prompt displayed (snackbar)
  - `getCountdownStartedPromise()` → next-round countdown started (snackbar)
  - `getRoundResolvedPromise()` → outcome finalized (assert `#round-message` and score)
  - `getRoundTimeoutPromise()` → timeout path active
  - `getStatSelectionStalledPromise()` → stall prompt displayed

## UI Surfaces to Assert

- Outcome messages → `#round-message`
- Countdown / dynamic hints → snackbar (via `showSnackbar` or `updateSnackbar`)

## Test-Mode Determinism

- In Vitest, Classic Battle adds small test-mode fallbacks to avoid flaky races:
  - `startRound()` applies UI immediately and emits `roundPrompt`.
- `selectionHandler` clears transient text and surfaces the opponent-delay snackbar during selection.
  - `handleStatSelectionTimeout()` only shows the stall message at timeout (not earlier).
  - `__triggerStallPromptNow(store)` surfaces a stall prompt immediately for tests.

## State Transition Listeners

- `battleStateChange` events now drive side effects such as DOM mirroring, debug logging, and resolving waiters.
- Tests should emit `battleStateChange` instead of mutating `document.body.dataset` or `window` globals.
- `src/helpers/classicBattle/stateTransitionListeners.js` exports:
  - `domStateListener` – mirrors state to `document.body.dataset` and dispatches a legacy `battle:state` event.
  - `createDebugLogListener(machine)` – updates debug globals and emits `debugPanelUpdate`.
  - `createWaiterResolver(stateWaiters)` – settles promises awaiting specific states.
- Register these listeners with `onBattleEvent('battleStateChange', ...)` after the state machine is created (see orchestrator init).

## Debug Hooks

Classic Battle exposes internal state for tests through `exposeDebugState(key, value)` and `readDebugState(key)`. Tests may monkey‑patch these helpers to inspect values without touching `window` globals.

```js
import * as debugHooks from "../../src/helpers/classicBattle/debugHooks.js";
const store = {};
vi.spyOn(debugHooks, "exposeDebugState").mockImplementation((k, v) => {
  store[k] = v;
});
vi.spyOn(debugHooks, "readDebugState").mockImplementation((k) => store[k]);
```
