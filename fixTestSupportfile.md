# Plan: Improve `testSupport.js` Code Quality and Maintainability

## Executive Summary

The `testSupport.js` file, while serving a clear purpose with good internal documentation, has been identified as an area for code quality improvement. Key concerns include a large function exceeding the 50-line limit, insufficient test coverage, and an ambiguous file location that blurs the lines between test utilities and production code.

This plan outlines concrete steps to address these issues, enhancing modularity, testability, and overall maintainability.

## Identified Issues

1.  **Function Size**: The `resolveRoundForTest` function (lines 154-208) significantly exceeds the recommended 50-line limit.
2.  **Missing Test Coverage**: Critical functions within `testSupport.js` lack dedicated unit tests.
3.  **Ambiguous Location**: The file's placement blurs the boundary between `test/` and `src/` concerns, especially given its import by `testApi.js` and `init.js`.
4.  **Undocumented Magic Number**: A `200ms` timeout on line 119 lacks clear explanation.
5.  **Lack of Type Definitions**: Complex option objects used by `resolveRoundForTest` do not have TypeScript definitions, hindering IDE support and type safety.

## Proposed Improvements (Steps)

1.  **Refactor `resolveRoundForTest`**:
    - **Action**: Extract helper functions from `resolveRoundForTest` (currently lines 154-208).
    - **Details**: Break down the 55-line function into smaller, single-responsibility pieces. Specifically, extract the opponent reveal handler, dispatch handler, and emit handler into their own functions.
    - **Goal**: Reduce the main `resolveRoundForTest` function to approximately 35 lines or fewer, significantly improving readability and testability.

2.  **Enhance File-level Documentation**:
    - **Action**: Add a comprehensive `fileoverview` JSDoc block to `testSupport.js` (at line 1).
    - **Details**: Document the architectural decision behind the file's current location (e.g., if it's intentionally placed near battleCLI-related code for specific reasons) and clarify its intended usage within the test ecosystem.

3.  **Implement Comprehensive Unit Tests**:
    - **Action**: Create a new test file: `tests/utils/battleCliTestSupport.test.js`.
    - **Details**: Add thorough test coverage for `normalizeRoundDetailForTest`, `resolveRoundForTest`, and all newly extracted helper functions. Ensure tests cover both happy paths and edge cases, as per `GEMINI.md` guidelines.

4.  **Document and Refine Magic Numbers**:
    - **Action**: Add an inline comment explaining the `200ms` timeout on `testSupport.js:119`.
    - **Details**: Explain its calculation (e.g., "~12 frames at 60fps"). **Suggestion**: Consider replacing the literal `200` with a well-named constant to improve clarity and maintainability (e.g., `const FRAME_SYNC_DELAY_MS = 200;`).

5.  **Add TypeScript Definitions**:
    - **Action**: Introduce `@typedef` JSDoc comments for complex option objects utilized by `resolveRoundForTest`.
    - **Details**: This will provide better IDE support, enhance code comprehension, and lay groundwork for potential future TypeScript migration.

## Further Considerations and Discussion Points

### Console Logging Pattern

- **Current State**: The existing code conditionally uses `console.debug`.
- **Discussion**: Should this be aligned with the `withMutedConsole` pattern established in other test utilities for better console discipline during tests, or is the conditional `console.debug` acceptable given its specific purpose for test debugging? If kept, ensure it's robustly disabled in production builds.

### File Location Strategy

- **Current State**: `testSupport.js` is imported by production code (`testApi.js`, `init.js`).
- **Discussion**:
  - Given that it's a "test support" file, should it be moved to a dedicated `utils/test` or `tests/utils` directory, and all relevant imports adjusted?
  - Alternatively, if it genuinely provides utility functions that _happen_ to be heavily used by tests but are also needed by production code, then its current location might be justified, but this requires explicit documentation (as per improvement step 2).
  - Moving it would enforce better separation of concerns and clarify the project structure.

### Breaking Changes Management

- **Concern**: Refactoring `resolveRoundForTest` and potentially moving the file could introduce breaking changes for its consumers.
- **Discussion**:
  - How should backward compatibility be managed? Can a clear migration path be provided for existing call sites?
  - Is it feasible to update all affected call sites simultaneously (e.g., within the same pull request)? A clear communication strategy and coordinated effort will be crucial.
