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

**Actions Taken:**

* Fixed the mock for `emitBattleEvent` in `tests/classicBattle/page-scaffold.test.js` to properly pass event objects with `detail` property to match the real CustomEvent behavior, allowing the `display.round.start` handler to access `e.detail.roundNumber`.

**Outcomes:**

* The test "updates scoreboard text when a mock round starts" now passes as the round number is correctly set to 3 and remains at 3 after roundEnded, since the mock for emitBattleEvent was fixed to properly pass event objects with `detail` property.
* No regressions detected in other tests in the same file; the other two failing tests remain as expected.
* The event flow remains unchanged, but the test mock is now more accurate to the real CustomEvent behavior.

**Opportunities for Improvement:**

* Centralize round state management to avoid conflicts between different events.
  * Phase 0 – Discovery: Catalog every emitter/consumer of `display.round.*`, `roundEnded`, and related events; capture the data each handler reads/writes, the order in which events fire, and the feature flags guarding them.
  * Phase 1 – Implementation: Introduce the coordinator module behind a feature flag, relocate round progression logic into it, and adapt `roundEnded`/`round.start` handlers to delegate while preserving existing side effects and telemetry.

* Use a single source of truth for the current round number, perhaps in a store or state manager.
  * Phase 0 – Requirements: Identify every consumer of the round number (UI, analytics, orchestration) and document their update cadence, precision requirements, and failure modes when state desynchronises.
  * Phase 1 – Store Definition: Define the API and lifecycle for the shared store (e.g., a lightweight observable or battle session state), including change notifications, read-only selectors, reset semantics, and serialization for replays or debugging.
  * Phase 2 – Migration: Replace direct reads/writes scattered through handlers with store interactions, ensure the scoreboard, snackbar, and tests consume selectors, and add guards to prevent out-of-band mutations or stale snapshots.
  * Phase 3 – Hardening: Create diagnostics around the store (dev-time assertions, debug log traces, Sentry breadcrumbs) and extend tests to cover concurrent update scenarios, round rollback cases, and state restoration after disconnects.

* Improve test isolation by mocking at the appropriate level to avoid race conditions.
  * Phase 0 – Audit: Review existing classic battle tests for direct DOM manipulation or mixed-layer mocks; document hotspots that frequently fail, the dependencies they stub, and scenarios they attempt to cover.
  * Phase 1 – Harness Enhancements: Expand shared test utilities to provide higher-level event simulation helpers (e.g., `emitRoundStart`, `clickStatButton`) and default console muting, and add fixtures for scheduler control.
  * Phase 2 – Test Refactor: Incrementally migrate flaky tests to the enhanced helpers, ensuring each refactor keeps identical assertions but removes brittle mocking; align all tests on fake timers instead of synchronous `requestAnimationFrame` shims.

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

**Evaluation:** The analysis is accurate. The root cause is the inadequate mock for `initStatButtons`, which fails to attach click event listeners to the stat buttons, preventing the test from triggering `handleStatSelection` and emitting the `round.resolved` event.

**Proposed Fix Plan:**

1. Improve the mock for `initStatButtons` to attach click event listeners to the buttons that call the mocked `handleStatSelection` function.
2. Ensure the mock simulates the real behavior of enabling buttons and attaching handlers.
3. If mocking remains complex, consider using the real `initStatButtons` and mocking only the necessary dependencies to avoid over-mocking.
4. Update the test to verify that click handlers are properly attached and functional.

**Opportunities for Improvement:**

* Enhance test mocking utilities to provide realistic simulations of DOM interactions.
  * Phase 0 – Inventory: List every bespoke DOM mock in the test suite and classify the interaction patterns they attempt to simulate.
  * Phase 1 – API Design: Specify a unified mocking surface (e.g., `createInteractiveButtonMock`) that mirrors production semantics, including event propagation and disabled states.
  * Phase 2 – Implementation: Build the utilities with thorough unit coverage, providing escape hatches for atypical interactions and instrumentation hooks for assertions.
  * Phase 3 – Adoption: Replace ad-hoc mocks in priority tests, gathering feedback on gaps; iterate until the majority of DOM interaction tests rely on the shared utilities.

* Implement shared mock helpers for common UI components to ensure consistency across tests.
  * Phase 0 – Requirements: Identify high-traffic UI components (scoreboard, snackbar, stat buttons) and map the behaviors tests need to orchestrate.
  * Phase 1 – Template Creation: Scaffold helper factories or fixture builders encapsulating lifecycle hooks, default props, and teardown mechanics.
  * Phase 2 – Integrate the new helpers into a representative suite (classic battle smoke tests) and validate reductions in boilerplate and flake rate.

* Add validation in tests to check that event listeners are attached correctly.
  * Phase 0 – Baseline: Determine the critical listeners that must always be wired (stat button clicks, round events) and capture their expected registration timing.
  * Phase 1 – Utility Support: Extend test helpers to expose assertions like `expectListenerAttached` or `getRegisteredHandlers` without peeking into private internals.
  * Phase 2 – Test Updates: Amend existing tests to assert listener presence immediately after setup and post-cleanup to detect leaks.

* Review and refactor tests that rely on deep mocking to use integration-style testing where possible.
  * Phase 0 – Candidate Selection: Rank tests by mock depth and failure frequency, prioritising those that stub more than two layers of dependency.
  * Phase 1 – Scenario Mapping: For each candidate, outline the user journey it attempts to verify and identify the minimal set of modules that can remain real.
  * Phase 2 – Refactor: Replace deep mocks with integration-friendly scaffolding (real DOM factories, real orchestrators) while keeping deterministic control via fake timers and controlled data fixtures.
  * Phase 3 – Regression Sweep: Run extended CI flake detection, capture before/after stability metrics, and ensure test duration remains acceptable.

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

**Evaluation:** The analysis is accurate. The root cause is the synchronous mock for `requestAnimationFrame` that causes the scheduler's loop to recurse infinitely without yielding control.

**Proposed Fix Plan:**

1. Replace the synchronous mock for `requestAnimationFrame` with a queue-based mock that allows manual flushing of pending frames.
2. Use Vitest's fake timers to control time progression and avoid replacing global browser APIs.
3. Refactor the test to use the scheduler's public API and fake timers instead of mocking `requestAnimationFrame`.
4. Implement a safer mock utility that can be reused across tests requiring animation frame control.

**Actions Taken:**

* Replaced the synchronous mock for `requestAnimationFrame` in `tests/helpers/classicBattle/utils.js` with a queue-based implementation that queues callbacks instead of executing them immediately, preventing infinite recursion.
* Added a `flushRAF` function to manually execute queued `requestAnimationFrame` callbacks for testing purposes.
* Updated the failing test in `tests/classicBattle/page-scaffold.test.js` to call `globalThis.flushRAF()` after enabling stat controls and after resetting stat buttons to ensure scheduler callbacks are processed without causing stack overflow.

**Outcomes:**

* The test "stat buttons re-enable when scheduler loop is idle" now passes without causing a maximum call stack size exceeded error, as the queue-based mock prevents infinite recursion in the scheduler loop.
* The queue-based mock provides a safer utility that can be reused across tests requiring animation frame control, addressing the root cause of the synchronous callback execution.
* Test results: 4 passed, 1 failed (the second failure remains unfixed as requested).
* The fix successfully resolves the stack overflow issue for the targeted test while maintaining functionality for other passing tests in the file.

**Opportunities for Improvement:**

* Develop a robust animation frame mocking utility that supports queuing and flushing callbacks.
  * Phase 0 – Research: Examine existing `requestAnimationFrame` usage across the app and document timing expectations (burst callbacks, idle frames, cancellation).
  * Phase 1 – Specification: Define the mock API (enqueue, flushNext, flushAll, cancel) and concurrency guarantees, including integration points with Vitest fake timers.
  * Phase 2 – Implementation: Build the utility with an internal queue and instrumentation counters, plus snapshot-based unit tests that assert ordering and cancellation semantics.
  * Phase 3 – Integration: Replace brittle inline mocks with the utility, updating tests to use explicit flush calls and verifying no regressions in scheduling-sensitive suites.
  * Phase 4 – Maintenance: Provide documentation, example usage, and lint checks to discourage reintroduction of synchronous `cb()` mocks.

* Standardize the use of fake timers in tests to avoid global API mocking.
  * Phase 0 – Assessment: Audit the suite for places replacing `setTimeout`, `requestAnimationFrame`, or scheduler internals manually; record incompatibilities with fake timers.
  * Phase 1 – Playbook: Publish a canonical setup/teardown snippet (e.g., `vi.useFakeTimers(); afterEach(vi.useRealTimers);`) and guidance on async helpers like `vi.runAllTimersAsync()`.
  * Phase 2 – Migration: Update critical classic battle and scheduler tests to adopt the playbook, ensuring helper utilities also assume fake timers by default.

* Enhance the scheduler module with test-friendly hooks for deterministic control.
  * Phase 0 – Requirement Gathering: Collaborate with gameplay engineers to list the scheduler behaviors tests need to orchestrate (pause, resume, inject callbacks).
  * Phase 1 – API Design: Propose optional hooks such as `withTestController` or dependency injection for the timing source, and review with maintainers for backward compatibility.
  * Phase 2 – Implementation: Introduce the hooks guarded by internal flags, update scheduler docs, and ensure production codepaths remain unaffected through regression tests.
  * Phase 3 – Test Adoption: Retrofit existing scheduler-focused tests to use the hooks, eliminating reliance on private internals or monkey-patching.

* Add safeguards in the scheduler to detect and prevent infinite loops during testing.
  * Phase 0 – Failure Analysis: Catalogue historical infinite-loop incidents and document the call patterns that triggered them.
  * Phase 1 – Safeguard Design: Define detection heuristics (max synchronous frame depth, loop duration thresholds) and decide on developer-facing warnings vs. hard failures.
  * Phase 2 – Implementation: Add guarded counters or watchdog timers within the scheduler, ensuring they can be toggled or relaxed for stress tests.
  * Phase 3 – Verification: Create targeted tests that intentionally trigger the safeguards to confirm they surface actionable diagnostics without false positives.
