# ROOT CAUSE: Unit Test Mock Not Applied to Handler

## Summary

The test `opponent-message-handler.improved.test.js` is failing because the event handler in `uiEventHandlers.js` is calling the REAL `getOpponentDelay()` function instead of the mocked version, even though the mock is set up correctly.

## Evidence

1. **Mock setup in test (line 34)**:

   ```javascript
   getOpponentDelay: getOpponentDelayMock;
   ```

   - Successfully applies mock to snackbar.js module

2. **Handler sees real implementation**:

   ```
   [uiEventHandlers] ...getOpponentDelay function: function getOpponentDelay() {
   ```

   - Function signature shows it's the REAL implementation, not a spy wrapper
   - Real function returns module-level state value of 500

3. **Module-level state in real snackbar.js (line 9)**:

   ```javascript
   let opponentDelayMs = 500;

   export function getOpponentDelay() {
     return opponentDelayMs;
   }
   ```

   - The real function has module-scoped state
   - When called, it returns the REAL module's state, not affected by test mocks

## The Problem

The test is using `vi.mock()` which replaces the module exports. However, `uiEventHandlers.js` imports `getOpponentDelay` at the TOP of the file:

```javascript
import { getOpponentDelay } from "./snackbar.js";
```

When this import is executed during module load in `beforeAll()`, it should get the mocked version. But somehow the handler is calling the real function.

Possible explanations:

1. The mock is being replaced AFTER the module loads
2. The vi.mock() call isn't working correctly for this specific import
3. There are two copies of the snackbar module, and the handler is using one while the test is mocking the other

## Solution

Since the test is trying to verify that the handler behaves correctly with different delay values, the test should:

1. Either mock the `getOpponentDelay` function properly at import time
2. Or use the real module and set the state through `setOpponentDelay()` if available
3. Or avoid dynamic mocking and prefer static imports that can be properly mocked

The simplest fix for the test is to ensure the mock is applied to the imports BEFORE modules are imported in `beforeAll()`. However, this might require restructuring how the test imports modules or uses mocks.

## Recommended Fix

Change the test to NOT import modules in `beforeAll()` - let vitest handle the imports after mocks are set up, or use `vi.resetModules()` to clear any cached imports before the test runs and reimport after mocks are applied.
