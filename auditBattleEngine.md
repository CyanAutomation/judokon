# Classic Battle Engine Complexity Audit

This document provides an audit of the JavaScript files within `src/helpers/classicBattle/`, identifying functions that are overly complex or hard to maintain, along with suggestions for improvement and a remediation plan. The assessment focuses on line count (functions >50 lines are a primary concern as per `GEMINI.md`), nesting depth, number of responsibilities, and overall readability.

## Remediation Log

- **TimerController fallback countdown**: The fallback countdown previously bypassed the injected scheduler, so mocked schedulers could not observe tick scheduling or cancellations. Routing both `setTimeout` and `clearTimeout` calls through the provided scheduler keeps fake timers deterministic and prevents regression tests from missing drift.
- **Card selection + battle score documentation**: Filled in the remaining `@summary`/`@pseudocode` blocks for exported helpers in `src/helpers/classicBattle/cardSelection.js` and `src/helpers/battle/score.js`, aligning them with the expectations spelled out in `GEMINI.md`.
- **Card selection data orchestration**: Extracted `loadJudokaData`, `loadGokyoLookup`, `selectOpponentJudoka`, and `renderOpponentPlaceholder` so `drawCards` now coordinates explicit helpers. The smaller helpers accept injected fetchers/containers, which keeps tests deterministic while shrinking the orchestration footprint
- **Round timer orchestration**: Broke `startTimer` into `resolveRoundTimerDuration`, `primeTimerDisplay`, `configureTimerCallbacks`, and `handleTimerExpiration`, enabling dependency injection for scoreboard/scheduler shims while reducing the orchestration function's complexity.

## General Observations

- **Orchestration Functions**: Many functions named `init*`, `setup*`, `handle*`, `bind*` tend to be complex because they orchestrate multiple sub-tasks. While some complexity is expected for orchestration, they often exceed reasonable limits.
- **DOM Manipulation**: Functions dealing heavily with DOM manipulation (creating elements, adding/removing classes, event listeners) often become complex, especially when combined with conditional logic and error handling.
- **Timer/Scheduler Logic**: Functions involving `setTimeout`, `requestAnimationFrame`, and custom schedulers are inherently more complex due to their asynchronous nature and the potential for race conditions.
- **Test-Specific Logic**: A significant amount of `if (IS_VITEST)` or `if (typeof process !== "undefined" && process.env && process.env.VITEST)` blocks add to the line count and conditional complexity. While necessary for testing, they make the core logic harder to read and maintain.
- **Missing JSDoc `@pseudocode`**: Many functions, even complex ones, are missing the `@pseudocode` tag in their JSDoc, which is a requirement from `GEMINI.md`.

## Detailed Function-Level Assessment

### `src/helpers/classicBattle/autoSelectHandlers.js`

- `handleStatSelectionTimeout` (approx. 30 lines): Medium complexity due to nested `setTimeout` calls and conditional logic for scheduling stalled prompts, countdowns, and auto-select.
  - **Suggestion**: Extract nested `setTimeout` callbacks into named helper functions to improve readability and testability.

### `src/helpers/classicBattle/autoSelectStat.js`

- `autoSelectStat` (approx. 30 lines): Medium complexity due to random stat selection, defensive DOM manipulation, and asynchronous waiting.
  - **Suggestion**: Separate DOM manipulation and feedback logic from the core stat selection and `onSelect` invocation.

### `src/helpers/classicBattle/bootstrap.js`

- `setupClassicBattlePage` (approx. 35 lines): Medium complexity. Orchestrates engine creation, event bridging, view/controller initialization, scoreboard setup, and debug API exposure.
  - **Suggestion**: Break down `startCallback` into smaller, focused functions (e.g., `initializeViewAndController`, `setupScoreboardWithTimerControls`).

### `src/helpers/classicBattle/cardSelection.js`

- `showLoadError` (approx. 40 lines): Medium complexity due to conditional message handling, modal creation, and retry logic.
  - **Suggestion**: Extract modal creation and button wiring into a dedicated helper function.
- `renderOpponentPlaceholder` (approx. 35 lines): Medium complexity due to conditional rendering, error handling, and DOM manipulation.
  - **Suggestion**: Decouple the `JudokaCard` rendering from the debug panel preservation and lazy portrait setup.
- `drawCards` (approx. 50 lines): **High complexity**. Orchestrates data loading, filtering, player card generation, opponent selection, and opponent placeholder rendering. Exceeds the informal 50-line limit.
  - **Suggestion**: Refactor into smaller functions: `loadBattleData`, `generatePlayerCard`, `selectOpponentJudoka`, `renderOpponentCardPlaceholder`.

### `src/helpers/classicBattle/controller.js`

- `startRound` (approx. 20 lines): Medium complexity due to nested `try/catch` blocks and orchestrating `_performStartRound` and `_awaitOpponentCard`.
  - **Suggestion**: Simplify error handling by centralizing it or using a more robust error propagation mechanism.

### `src/helpers/classicBattle/cooldowns.js`

- `initInterRoundCooldown` (approx. 50 lines): **High complexity**. Long function with dynamic imports, complex timer setup, event handling, and skip handler management. Exceeds the informal 50-line limit.
  - **Suggestion**: Break down into `computeCooldownDuration`, `setupCooldownTimer`, `handleCooldownExpiration`, `wireNextButtonReadiness`.

### `src/helpers/classicBattle/debugLogger.js`

- `BattleDebugLogger.query` (approx. 25 lines): **High complexity**. Multiple filtering conditions, sorting, and slicing make this function dense.
  - **Suggestion**: Extract individual filtering and sorting logic into private helper methods.
- `BattleDebugLogger.getStats` (approx. 20 lines): **High complexity**. Iterates through the buffer to compute various statistics.
  - **Suggestion**: Separate the counting logic for categories and levels into distinct helper functions.
- `createComponentLogger` (approx. 15 lines): Medium complexity. Returns an object with multiple logging functions, which can be hard to test.
  - **Suggestion**: Consider a class-based approach for component loggers or a factory that returns a simpler API.

### `src/helpers/classicBattle/debugPanel.js`

- `ensureDebugPanelStructure` / `persistDebugPanelState` / `mountDebugPanel` (approx. 15 lines each): **Medium complexity**. Shared helpers centralize DOM creation, persistence wiring, and mounting logic for the debug panel.
  - **Suggestion**: Consider a light-weight class or module namespace if additional responsibilities accumulate.
- `initDebugPanel` (approx. 20 lines): **Medium complexity** after delegating the heavy DOM work to the shared helpers.
  - **Suggestion**: Continue to lean on the helpers to keep initialization thin and testable.
- `setDebugPanelEnabled` (approx. 20 lines): **Medium complexity** with the shared helpers handling structure/persistence/mounting.
  - **Suggestion**: Ensure helper coverage in tests to guard against regressions when toggling the panel dynamically.

### `src/helpers/classicBattle/endModal.js`

- `showEndModal` (approx. 30 lines): Medium complexity due to modal creation, content setting, and wiring replay/quit buttons.
  - **Suggestion**: Extract modal content generation and button event wiring into separate functions.

### `src/helpers/classicBattle/engineBridge.js`

- `bridgeEngineEvents` (approx. 30 lines): Medium complexity due to multiple `onEngine` listeners and nested `try/catch` blocks for event re-emission and normalization.
  - **Suggestion**: Create a map of engine event types to battle event types and iterate over it to reduce repetition.

### `src/helpers/classicBattle/eventAliases.js`

- `emitEventWithAliases` (approx. 20 lines): Medium complexity due to loop, conditional warning, and dispatching multiple events.
  - **Suggestion**: Separate the deprecation warning logic from the event dispatching loop.
- `emitBattleEventWithAliases` (approx. 25 lines): Medium complexity due to dynamic import fallback, conditional warning, and resolving event target.
  - **Suggestion**: Centralize the logic for resolving the battle event target.

### `src/helpers/classicBattle/eventDispatcher.js`

- `dispatchBattleEvent` (approx. 25 lines): Medium complexity due to conditional machine access, `try/catch` blocks, and emitting interrupt events.
  - **Suggestion**: Simplify the machine retrieval logic and centralize error handling for dispatch failures.

### `src/helpers/classicBattle/interruptHandlers.js`

- `initInterruptHandlers` (approx. 20 lines): Medium complexity as it orchestrates the setup of navigation and error handlers.
  - **Suggestion**: Break down into `setupNavigationHandlers` and `setupErrorHandlers`.
- `showErrorDialog` (approx. 30 lines): Medium complexity due to modal creation, update logic, and reload functionality.
  - **Suggestion**: Extract modal creation and button wiring into a dedicated helper.

### `src/helpers/classicBattle/opponentController.js`

- `getOpponentCardData` (approx. 15 lines): Medium complexity due to multiple asynchronous data fetching and state manipulation.
  - **Suggestion**: Use `Promise.all` for concurrent data fetching and simplify the data enrichment process.

### `src/helpers/classicBattle/orchestrator.js`

- `emitStateChange` (approx. 25 lines): Medium complexity due to collecting engine context, logging, mirroring timer state, and emitting events with conditional debug exposure.
  - **Suggestion**: Extract timer state mirroring and debug exposure into a separate, focused function.
- `attachListeners` (approx. 40 lines): **High complexity**. Sets up many event listeners (DOM, debug), exposes debug getters, and handles visibility/timer drift/injected errors.
  - **Suggestion**: Decompose into `attachDomListeners`, `attachDebugListeners`, `exposeMachineDebugApi`, `handleEngineLifecycleEvents`.
- `initClassicBattleOrchestrator` (approx. 35 lines): **High complexity**. The main orchestration function, responsible for preloading dependencies, setting up context, defining `onTransition`, creating the state manager, and attaching listeners.
  - **Suggestion**: Break down into `initializeOrchestratorContext`, `defineStateTransitionLogic`, `createAndAttachStateManager`.
- `onTransition` (nested in `initClassicBattleOrchestrator`, approx. 20 lines): Medium complexity due to logging, calling `onStateChange`, and emitting various diagnostic and state change events.
  - **Suggestion**: Group related event emissions into a single helper function.

### `src/helpers/classicBattle/promises.js`

- `setupPromise` (approx. 25 lines): Medium complexity due to nested `Promise` creation, `onBattleEvent` handler, and window-scoped exposure.
  - **Suggestion**: Simplify the promise creation and resolution logic, potentially by using a more declarative event-to-promise pattern.

### `src/helpers/classicBattle/quitModal.js`

- `createQuitConfirmation` (approx. 40 lines): **High complexity**. Creates modal, sets content, wires cancel/quit buttons, handles dispatch and navigation.
  - **Suggestion**: Extract modal content generation, button wiring, and navigation logic into separate, testable functions.
- `quitMatch` (approx. 25 lines): Medium complexity due to promise creation, modal handling, and polling for the confirm button.
  - **Suggestion**: Decouple the promise resolution from the modal creation and polling.

### `src/helpers/classicBattle/roundManager.js`

- `handleReplay` (approx. 25 lines): Medium complexity due to conditional engine recreation, event bridging, UI reset, and scoreboard updates.
  - **Suggestion**: Separate engine management from UI reset and scoreboard updates.
- `startCooldown` (approx. 60 lines): **Very High complexity**. Very long function with complex conditional logic for orchestrated mode, multiple event listeners, and nested functions for timer wiring. Exceeds the informal 50-line limit.
  - **Suggestion**: This function needs significant refactoring. Break it down into `createCooldownControls`, `setupOrchestratedCooldown`, `setupNonOrchestratedCooldown`, `wireNextRoundTimer`.
- `setupOrchestratedReady` (approx. 40 lines): **High complexity**. Manages cleanup functions, event listeners, and various readiness checks.
  - **Suggestion**: Extract event listener registration and cleanup into a dedicated helper.
- `wireNextRoundTimer` (approx. 50 lines): **High complexity**. Long function with complex timer setup, event listeners, and conditional fallback. Exceeds the informal 50-line limit.
  - **Suggestion**: Decompose into `createAndAttachTimer`, `setupTimerEventHandlers`, `scheduleFallbackTimer`.
- `_resetForTest` (approx. 45 lines): **High complexity**. Resets many subsystems (skip state, selection, engine, scheduler), handles conditional engine recreation, and clears store state.
  - **Suggestion**: Break down into `resetSubsystems`, `resetStoreState`, `emitUIResetEvent`.

### `src/helpers/classicBattle/roundResolver.js`

- `evaluateOutcome` (approx. 40 lines): Medium complexity due to `try/catch` blocks, conditional debug logging, and direct DOM updates for tests.
  - **Suggestion**: Separate test-specific DOM updates into a test utility or mock.
- `computeRoundResult` (approx. 15 lines): Medium complexity as it orchestrates `evaluateOutcome`, `dispatchOutcomeEvents`, `updateScoreboard`, and `emitRoundResolved`.
  - **Suggestion**: This function is an orchestrator; its complexity is acceptable if the functions it calls are simple.

### `src/helpers/classicBattle/roundSelectModal.js`

- `initRoundSelectModal` (approx. 60 lines): **Very High complexity**. Very long function with conditional autostart/test mode logic, modal creation, keyboard event handling, and asynchronous tooltip initialization. Exceeds the informal 50-line limit.
  - **Suggestion**: This function needs significant refactoring. Break down into `handleAutostartLogic`, `createRoundSelectionModal`, `wireRoundSelectionButtons`, `setupKeyboardNavigation`.
- `applyGameModePositioning` (approx. 60 lines): **Very High complexity**. Very long function with complex DOM manipulation, event listeners for resize/orientation, and cleanup logic. Exceeds the informal 50-line limit.
  - **Suggestion**: Encapsulate positioning logic within a dedicated class or module that manages its own lifecycle (attach/detach listeners).

### `src/helpers/classicBattle/roundUI.js`

- `applyRoundUI` (approx. 45 lines): **High complexity**. Resets UI, updates scoreboard, shows prompt, starts timer, and schedules stall timeout.
  - **Suggestion**: Break down into `resetRoundUIElements`, `updateScoreboardAndCounter`, `startRoundTimersAndStallDetection`.
- `bindRoundResolved` (approx. 45 lines): **High complexity**. Handles outcome, score updates, match end logic, cooldown scheduling, and stat button resets.
  - **Suggestion**: Separate match end handling and cooldown scheduling into distinct functions.
- `bindRoundUIEventHandlersDynamic` (approx. 60 lines): **Very High complexity**. Very long function with complex asynchronous imports, event listener registration, and conditional logic for UI updates. Exceeds the informal 50-line limit.
  - **Suggestion**: This function needs significant refactoring. Break down into `setupDynamicRoundStartedHandler`, `setupDynamicStatSelectedHandler`, `setupDynamicRoundResolvedHandler`.

### `src/helpers/classicBattle/selectionHandler.js`

- `emitSelectionEvent` (approx. 25 lines): Medium complexity due to emitting multiple events and test-specific DOM cleanup.
  - **Suggestion**: Separate test-specific DOM cleanup into a test utility.
- `handleStatSelection` (approx. 70 lines): **Very High complexity**. Very long function with many responsibilities: validation, store update, timer cleanup, event emission, orchestrator dispatch, fallback resolution, and UI updates. Exceeds the informal 50-line limit.
  - **Suggestion**: This function is a prime candidate for significant refactoring. Break down into `validateAndApplySelection`, `cleanupAndEmitSelection`, `resolveRoundViaOrchestratorOrDirectly`, `updateUIAfterResolution`.
  - **2024-Refactor**: Extracted `validateAndApplySelection`, `dispatchStatSelected`, `resolveWithFallback`, and `syncResultDisplay` helpers so `handleStatSelection` now orchestrates the flow.

### `src/helpers/classicBattle/setupUIBindings.js`

- `setupUIBindings` (approx. 20 lines): **High complexity**. While short, this function orchestrates many UI setup tasks (scoreboard, quit button, interrupt handlers, orientation, stat buttons, battle progress, labels, tooltips, hints).
  - **Suggestion**: This function is an orchestrator; its complexity is acceptable if the functions it calls are simple. However, ensure each sub-setup function is itself simple and focused.

### `src/helpers/classicBattle/stateManager.js`

- `createStateManager` (approx. 45 lines): **High complexity**. Core state machine logic, including building state map, initializing machine, handling dispatch, and running `onEnter` handlers.
  - **Suggestion**: Extract the state transition logic within `dispatch` into a separate helper function.

### `src/helpers/classicBattle/timerService.js`

- `onNextButtonClick` (approx. 30 lines): **High complexity**. Complex conditional logic for advancing/canceling, emitting events, and setting warning timeouts.
  - **Suggestion**: Break down into `handleNextButtonAdvance`, `handleNextButtonCancel`, `logCooldownWarning`.
- `startTimer` (approx. 70 lines): **Very High complexity**. Very long function with complex timer duration determination, `onTick`/`onExpired` handlers, skip handler registration, and auto-select logic. Exceeds the informal 50-line limit.
  - **Suggestion**: This function needs significant refactoring. Break down into `determineTimerDuration`, `setupTimerCallbacks`, `createAndStartRoundTimer`, `handleTimerExpiration`.

### `src/helpers/classicBattle/uiHelpers.js`

- `watchBattleOrientation` (approx. 35 lines): **High complexity**. Involves polling, `requestAnimationFrame`, and event listeners for orientation and resize changes.
  - **Suggestion**: Encapsulate the orientation watching logic within a dedicated module or class that manages its own lifecycle.
- `initStatButtons` (approx. 35 lines): **High complexity**. Initializes stat buttons, wires click handlers, sets up hotkeys, and manages enable/disable states.
  - **Suggestion**: Break down into `getStatButtonsAndContainer`, `createStatButtonControls`, `wireStatButtonEvents`.
- `syncScoreDisplay` (approx. 35 lines in `uiService.js`): Medium complexity due to conditional DOM manipulation and debug logging.
  - **Suggestion**: Separate DOM manipulation logic from score retrieval and component updates.

### `src/helpers/classicBattle/uiEventHandlers.js`

- `bindUIHelperEventHandlersDynamic` (approx. 25 lines): Medium complexity due to `WeakSet` guard, `async` event listeners, and `try/catch` blocks.
  - **Suggestion**: Extract individual event handlers into separate named functions for clarity.

## Suggestions for Improvement (General)

1. **Extract Sub-Functions**: Break down large functions (especially those >50 lines) into smaller, single-responsibility functions. For example, in `handleStatSelection`, the validation, store update, timer cleanup, event emission, and resolution logic could be separate functions.
2. **Reduce Nesting**: Refactor deeply nested `if/else` or `try/catch` blocks. Guard clauses at the beginning of functions can reduce nesting.
3. **Separate Concerns**:
   - **UI Logic vs. Business Logic**: Clearly separate functions that manipulate the DOM from those that implement game rules or state transitions.
   - **Test-Specific Code**: Consider moving test-specific logic (e.g., `if (IS_VITEST)`) into dedicated test utilities or using dependency injection to provide test-specific implementations.
   - **Error Handling**: Centralize error handling where possible, rather than scattering `try/catch` blocks everywhere.
4. **Improve JSDoc**: Add `@pseudocode` to all public and complex functions as per `GEMINI.md`. Ensure existing JSDoc is accurate and comprehensive.
5. **State Management**: For functions that manage complex state (like `initDebugPanel` or `applyGameModePositioning`), consider using a more declarative approach or a small state machine if appropriate, to make transitions and side effects clearer.
6. **Dependency Injection**: For functions that depend on many external modules or global state, consider passing these dependencies as arguments or through a context object to improve testability and reduce coupling.
7. **Event-Driven Architecture**: While the project uses an event bus, some functions still directly call other modules. Reinforce the event-driven pattern where appropriate to further decouple components.

## Remediation Plan

**Phase 1: Documentation and Identification (Current Phase)**

- Complete the audit, identifying all overly complex functions.
- Ensure all public and complex functions have accurate JSDoc with `@pseudocode`. (This will be an ongoing task during refactoring).

**Phase 2: Prioritization and Small Refactors (Next Step)**

- **Prioritize**: Focus on the "Very High complexity" functions first, followed by "High complexity" functions.
  - `handleStatSelection`
  - `startTimer`
  - `initRoundSelectModal`
  - `applyGameModePositioning`
  - `startCooldown`
  - `initDebugPanel` / `setDebugPanelEnabled`
  - `initInterRoundCooldown`
  - `drawCards`
  - `bindRoundUIEventHandlersDynamic`
- For functions slightly over the line limit or with minor nesting issues, perform small, targeted refactors to extract helper functions or simplify conditional logic.
- Add unit tests for newly extracted helper functions to ensure correctness.

**Phase 3: Major Refactoring (Iterative)**

- For the most complex functions identified in Phase 2, plan a more significant refactoring. This will involve:
  - **Decomposition**: Breaking down large functions into smaller, single-responsibility units.
  - **Encapsulation**: Creating classes or modules to manage related state and behavior (e.g., a `DebugPanel` class).
  - **Declarative Logic**: Moving towards more declarative code where possible, especially for UI updates and state transitions.
- Each major refactoring should be accompanied by:
  - New or updated unit tests to maintain coverage and ensure the refactored code behaves as expected.
  - Verification against the core validation suite (`npx eslint .`, `npx vitest run`, `npm run check:jsdoc`, `npx prettier . --check`).
  - Review of the `GEMINI.md` guidelines (e.g., function line limits, JSDoc).

**Phase 4: Continuous Improvement**

- Integrate complexity metrics (e.g., cyclomatic complexity, line count) into the CI/CD pipeline to prevent future regressions.
- Regularly review new code for adherence to modularity and readability standards.
- Conduct periodic code reviews focusing on maintainability and adherence to architectural principles.

## Detailed Function-Level Assessment for `src/helpers/battle/`

This section provides an audit of the JavaScript files within `src/helpers/battle/`, identifying functions that are overly complex or hard to maintain, along with suggestions for improvement and a remediation plan. The assessment focuses on line count (functions >50 lines are a primary concern as per `GEMINI.md`), nesting depth, number of responsibilities, and overall readability.

### General Observations

- **No functions exceed 50 lines**: This is a positive indicator, suggesting that functions are generally well-scoped and adhere to the recommended size limits.
- **DOM Interaction**: The functions identified as having medium complexity primarily involve direct DOM manipulation and interaction. This inherently adds some complexity due to the need for defensive coding and handling browser-specific behaviors (like reflow).
- **Defensive Coding**: The presence of `try/catch` blocks and conditional checks for `window` and `document` availability is good practice, but it does contribute to the line count and perceived complexity.
- **JSDoc**: While JSDoc comments are present, some `@pseudocode` sections are marked as `TODO`, indicating incomplete documentation. This is a requirement from `GEMINI.md`.

### `src/helpers/battle/battleUI.js`

- `resetStatButtons` (approx. 20 lines): Medium complexity. This function clears visual selection, disables buttons, forces reflow, and then re-enables buttons. The reflow and re-enable logic, especially with the conditional test mode, adds a layer of complexity.
  - **Suggestion**: Consider extracting the reflow and re-enable logic into a dedicated, small helper function to improve clarity.
- `showResult` (approx. 30 lines): Medium complexity. This function displays a message and handles a fading animation using `setTimeout` and `requestAnimationFrame`. The animation logic and the `cancelFade` mechanism contribute to its complexity.
  - **Suggestion**: Encapsulate the animation logic within a separate utility or a small class if similar animations are used elsewhere.

### `src/helpers/battle/engineTimer.js`

- `startRoundTimer` (approx. 15 lines): Low to Medium complexity. This function orchestrates the starting of a round timer, emitting `roundStarted` and `timerTick` events, and delegating to `TimerController.startRound`. Its role as an orchestrator makes it slightly more complex than a single-purpose utility.
  - **Suggestion**: Its current complexity is acceptable for an orchestration function. Ensure the underlying `TimerController.startRound` is well-documented and simple.
- `startCoolDownTimer` (approx. 15 lines): Low to Medium complexity. Similar to `startRoundTimer`, it orchestrates the starting of a cooldown timer. Its complexity is acceptable for its role.
  - **Suggestion**: Similar to `startRoundTimer`, ensure the underlying `TimerController.startCoolDown` is well-documented and simple.
- Other functions (`pauseTimer`, `resumeTimer`, `stopTimer`, `handleTabInactive`, `handleTabActive`, `handleTimerDrift`): All are simple and focused, adhering to good practices.

### `src/helpers/battle/index.js`

- This file primarily serves as an aggregation point, re-exporting functions from other modules. It does not contain any functions of its own that require auditing.

### `src/helpers/battle/score.js`

- `getStatValue` (approx. 20 lines): Medium complexity. This function involves calculating a stat's index, querying the DOM for a specific element, parsing its text content, and includes defensive `try/catch` blocks for error handling during DOM interaction. The defensive coding adds to its complexity.
  - **Suggestion**: Ensure the defensive checks are strictly necessary and cannot be simplified or abstracted into a more generic DOM querying utility if similar patterns exist elsewhere.

## Suggestions for Improvement (General)

1. **Extract DOM-specific helpers**: For functions like `resetStatButtons` and `showResult` in `battleUI.js`, consider extracting the core DOM manipulation logic into smaller, more focused helper functions if they become more complex in the future. This can improve readability and testability.
2. **Complete JSDoc**: Prioritize updating all `TODO` `@pseudocode` sections in the JSDoc comments across all files in `src/helpers/battle/`. Accurate and comprehensive pseudocode is a requirement from `GEMINI.md` and crucial for maintainability.
3. **Centralize DOM queries**: For frequently queried elements (e.g., `#stat-buttons`, `#round-message`), consider caching their references or providing a centralized utility for DOM access. This can reduce repetition, improve performance, and make future changes easier.

## Remediation Plan

**Phase 1: Documentation and Minor Refinements (Immediate Action)**

- **Complete JSDoc**: Go through `src/helpers/battle/battleUI.js` and `src/helpers/battle/score.js` and fill in all `TODO` `@pseudocode` sections. This is a critical first step to improve maintainability and adherence to project standards.
- **Review Defensive Coding**: For `getStatValue` in `src/helpers/battle/score.js`, review the `try/catch` blocks and conditional `window` checks. Ensure they are essential for robustness and cannot be simplified or replaced by more idiomatic patterns.
- **Small Refactors**: For `resetStatButtons` and `showResult` in `src/helpers/battle/battleUI.js`, evaluate if any small, isolated parts of their DOM manipulation logic can be extracted into private helper functions. This aims to improve clarity and modularity, even if it doesn't drastically reduce line count.

**Phase 2: Continuous Monitoring (Ongoing)**

- The functions in `src/helpers/battle/` generally adhere to good practices and do not currently contain functions that are critically complex or significantly exceed line limits.
- Continue to monitor these files during future development. If new features or changes cause any function to approach or exceed the 50-line limit, or if nesting depth increases significantly, then a more thorough refactoring should be considered.
- Ensure that any new code added to this directory follows the established conventions and maintains the current level of modularity and readability, especially regarding DOM interaction and asynchronous operations.
