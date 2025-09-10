# Analysis of timeoutInterrupt.cooldown.test.js Failure

This document outlines the investigation into the timeout failure of the unit test in `tests/helpers/classicBattle/timeoutInterrupt.cooldown.test.js`.

## Problem Description

The test `advances from cooldown after interrupt with 1s auto-advance` was failing with a 5000ms timeout error. The test is intended to verify that the classic battle state machine correctly handles a player selection timeout, transitions to a cooldown period, and then auto-advances to the next round.

## Investigation Steps

My investigation followed these steps:

1.  **Code Review:** I started by reviewing the test file, the classic battle orchestrator (`orchestrator.js`), the state machine definition (`stateTable.js`), and the relevant `onEnter` handlers for the states involved in the test.

2.  **Event Name Mismatch:** I discovered a mismatch between the event name the test was waiting for (`roundTimeout`) and the event name being dispatched by the timeout handling logic (`control.countdown.started`). I corrected this by aligning the event names in `promises.js`.

3.  **Missing Timer Logic:** I found that the `onEnter` handler for the `waitingForPlayerAction` state was not starting the selection timer as documented in `stateTable.js`. I added the timer logic to `waitingForPlayerActionEnter.js`.

4.  **Fake Timer Issues:** I realized that the test was using `vi.useFakeTimers()`, but the timer logic I added was using the real `setTimeout`. I corrected this by using a scheduler that could be replaced with `vi.timers` in the test environment.

5.  **Debugging Attempts:** I attempted to debug the test by adding `console.log` statements to the test file and the application code. However, I was unable to see any console output from the test runner, which made it impossible to determine the exact point of failure.

## Root Cause Analysis

The root cause of the test failure is a combination of factors:

*   **Inconsistent Event Names:** The event names used in the testing promises did not match the event names used in the application code.
*   **Incomplete State Machine Implementation:** The `waitingForPlayerAction` state was missing the timer logic that was documented in the state table.
*   **Untestable Timer Logic:** The timer logic was not designed to be easily testable with fake timers.
*   **Debugging Environment Issues:** The inability to see console output from the test runner made it impossible to effectively debug the test.

## Recommendations for Next Steps

1.  **Fix Console Output:** The highest priority is to resolve the issue with the test runner's console output. Without the ability to log information, debugging complex issues like this is nearly impossible.

2.  **Systematic State Machine Debugging:** A more systematic approach to debugging the state machine is needed. This could involve:
    *   Adding a visual state machine debugger.
    *   Implementing a more robust logging system that can be enabled or disabled as needed.
    *   Writing more focused unit tests for individual state transitions.

3.  **Refactor Timer Logic:** The timer logic in the battle orchestrator should be refactored to make it more testable. This could involve:
    *   Creating a dedicated timer service that can be easily mocked or replaced in tests.
    *   Using a dependency injection framework to provide the timer service to the state machine.

4.  **Review Test Suite:** The entire test suite for the classic battle orchestrator should be reviewed to ensure that it is robust, reliable, and easy to debug.
