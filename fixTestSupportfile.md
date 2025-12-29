Plan: Improve testSupport.js Code Quality
Based on comprehensive analysis of testSupport.js, the file has excellent documentation and clear purpose but suffers from one function exceeding the 50-line limit, missing test coverage, and an unusual location that blurs test/production boundaries.

Steps
Extract helper functions from resolveRoundForTest in testSupport.js:154-208 — Break 55-line function into smaller pieces: extract opponent reveal handler, dispatch handler, and emit handler to reduce main function to ~35 lines

Add fileoverview documentation to testSupport.js:1 — Document architectural decision for location (why test utility lives in battleCLI instead of utils)

Create comprehensive unit tests at tests/utils/battleCliTestSupport.test.js — Add test coverage for normalizeRoundDetailForTest, resolveRoundForTest, and all helper functions

Document magic number in testSupport.js:119 — Add inline comment explaining 200ms timeout calculation (~12 frames at 60fps)

Add TypeScript definitions to testSupport.js — Add @typedef for complex option objects used by resolveRoundForTest to improve IDE support

Further Considerations
Console logging pattern? — Current code uses console.debug conditionally. Should we replace with withMutedConsole pattern from other test utilities or keep for debugging?

Location strategy? — File is imported by production code (testApi.js, init.js). Should we move to utils and adjust imports, or document that test utilities can live near the code they test?

Breaking changes? — Refactoring resolveRoundForTest may affect consumers. Should we maintain backward compatibility or update all call sites simultaneously?