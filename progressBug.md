# Bug Analysis Report

This report details the root causes for three unit test failures in `tests/classicBattle/page-scaffold.test.js` and provides recommendations for resolution.

---

### 1. Failure: Incorrect Round Number

**Test:** `updates scoreboard text when a mock round starts`

**Symptom:** AssertionError: expected 'Round 1' to contain 'Round 3'.

**Root Cause:**
The test fails due to a race condition between two different ways of updating the scoreboard's round counter.

1. The test calls `emitBattleEvent("display.round.start", { roundNumber: 3 });`, which is intended to directly update the UI to show "Round 3".
2. Immediately after, the test triggers a `roundEnded` event on a mocked battle engine.
3. The application's event handler for `roundEnded` fetches the number of rounds played from the mocked engine (which is `0`) and calculates the *next* round number as `0 + 1 = 1`.
4. This action updates the UI to "Round 1", overwriting the "Round 3" text that was set just before, causing the assertion to fail.

The underlying issue is that the `roundEnded` event handler derives the round state from the engine instead of respecting the state potentially set by other UI events.

**Recommendations:**

* **Fix:** Refactor the `roundEnded` event handler. It should not be responsible for calculating and displaying the next round number. The round progression logic should be centralized. A single source of truth should exist for the current round number. The handler should likely focus only on things that happen *at the end* of a round, like updating scores. The start of a *new* round should be a separate, distinct event.
* **Testing:** The test itself should be refactored to avoid mixing direct UI manipulation events (`display.round.start`) with engine state events (`roundEnded`) in a way that creates ambiguity. Tests should be more focused on a single behavior.

**Evaluation:** The analysis is accurate. The root cause is the race condition between display.round.start and roundEnded events, where roundEnded triggers the next round start, overwriting the round number set by display.round.start.

**Proposed Fix Plan:**

1. Refactor the roundEnded event handler to not automatically start the next round. Instead, have roundEnded focus on end-of-round actions like updating scores.

2. Introduce a new event, e.g., "round.start", that is responsible for starting a new round and updating the round counter.

3. Update the event flow so that roundResolved emits roundEnded for UI updates, and then the cooldown completion emits round.start.

4. Refactor the test to not mix display.round.start with roundEnded. The test should focus on the start event only, or test the end event separately.

**Opportunities for Improvement:**

* Centralize round state management to avoid conflicts between different events.

* Use a single source of truth for the current round number, perhaps in a store or state manager.

* Improve test isolation by mocking at the appropriate level to avoid race conditions.

---

### 2. Failure: Test Timeout

**Test:** `render enabled after start; clicking resolves and starts cooldown`

**Symptom:** Test timed out in 5000ms.

**Root Cause:**
The test times out because a promise that waits for the `round.resolved` event never resolves.

1. The test simulates a user clicking a "stat button".
2. This click should trigger the `handleStatSelection` function, which is mocked to emit the `round.resolved` event.
3. However, the `initStatButtons` function, which is responsible for attaching the click event listeners to the buttons, is mocked with a simple placeholder: `vi.mock("../../src/helpers/classicBattle/uiHelpers.js", () => ({ ... initStatButtons: vi.fn(() => ({ enable: vi.fn(), disable: vi.fn() })) ... }))`.
4. Because the real `initStatButtons` is not used, no click handler is ever attached to the button.
5. The `buttons[0].click()` call does nothing, `handleStatSelection` is never invoked, the `round.resolved` event is never emitted, and the test hangs indefinitely waiting for the promise to resolve.

**Recommendations:**

* **Fix:** The mock for `../../src/helpers/classicBattle/uiHelpers.js` needs to be improved. Instead of just being a `vi.fn()`, the mocked `initStatButtons` should simulate the real function's behavior by actually attaching a click listener to the buttons that calls the mocked `handleStatSelection`.
* **Alternative Fix:** Avoid mocking `uiHelpers.js` altogether in this test if possible, and instead rely on the real implementation to integrate the components. If the module must be mocked due to other dependencies, the mock must be made more realistic for the behavior under test.

---

### 3. Failure: Maximum Call Stack Size Exceeded

**Test:** `stat buttons re-enable when scheduler loop is idle`

**Symptom:** RangeError: Maximum call stack size exceeded.

**Root Cause:**
The test fails due to an infinite recursive loop between the animation scheduler (`src/utils/scheduler.js`) and a test utility (`tests/helpers/classicBattle/utils.js`).

1. The stack trace shows `scheduler.js`'s `loop` function calling a function in `utils.js`, which then calls the scheduler's `loop` again.
2. The test utility `tests/helpers/classicBattle/utils.js` contains a function `setupClassicBattleDom` which mocks `globalThis.requestAnimationFrame` with `vi.fn((cb) => cb())`. This makes `requestAnimationFrame` synchronous and immediate.
3. The real `scheduler.js` uses `requestAnimationFrame` to schedule its next iteration.
4. In the failing test, it appears the real scheduler is being used. When its `loop` runs, it executes callbacks. One of these callbacks, directly or indirectly, seems to be calling back into a function from the test utility that triggers another scheduler frame request.
5. Because the mocked `requestAnimationFrame` is synchronous, the scheduler's loop executes immediately and recursively without yielding to the browser's event loop, leading to a stack overflow.

**Recommendations:**

* **Fix:** The mock for `requestAnimationFrame` in `tests/helpers/classicBattle/utils.js` is too simplistic and dangerous. It should not call the callback immediately. A better approach would be to use Vitest's fake timers to control the animation frames in a deterministic way, or to create a more sophisticated mock that allows manual flushing of frames.
* **Testing:** The test `stat buttons re-enable when scheduler loop is idle` is complex. It should be reviewed to see if its goal can be achieved without such heavy-handed mocking of global functions like `requestAnimationFrame`. It might be possible to test the desired behavior by interacting with the scheduler's public API (`start`, `stop`, `onFrame`) and using fake timers to advance time, rather than replacing the underlying browser mechanism.
