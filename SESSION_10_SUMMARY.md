# Session 10: Vitest Migration - Quick-Win Analysis & Pattern Discovery

## Overview

**Session**: Continuation after Session 9  
**Objective**: Continue aggressive Vitest test harness migration (vi.doMock → vi.mock pattern)  
**Duration**: Investigation & Planning Phase  
**Outcome**: PATTERN DISCOVERY + ROADMAP FOR REMAINING WORK

## What We Accomplished

### 1. Investigation: Attempted Complex Migration

**File**: `tests/pages/battleCLI.helpers.test.js` (1 mock, 7 tests)

**What We Tried**:
- Migrated single vi.doMock() call from helper function to vi.hoisted() + top-level vi.mock() pattern
- Created `configureEngineFacadeMock()` helper to replace the vi.doMock() call
- Updated test code to call the configuration function

**What Failed**:
- 3 of 7 tests failed with assertion mismatches
- Mock implementations weren't being properly applied through delegation chain
- Root cause: Attempted to pass vi.fn to .mockImplementation() of another vi.fn - improper chain

**Why It's Complex**:
- The `loadBattleCLI()` test utility also mocks the same module with vi.doMock()
- This creates hidden module-level mock interdependencies
- Tests pass `mockBattleEngine: false` to avoid loadBattleCLI's internal mock
- Our top-level vi.mock() should take precedence, but delegation pattern was flawed

**Decision**: Reverted to original working version (vi.doMock in helper function)  
**Rationale**: File works correctly as-is; migration effort is high relative to current project priorities

### 2. Discovery: Comprehensive Scan of Remaining Work

**Scan Results**: 31 files still contain vi.doMock() calls

**Categorized into Tiers**:

#### Tier A: Complex Helper Patterns (5+ files)
- vi.doMock() in helper functions with module interdependencies
- Examples: battleCLI.helpers, battleCLI.dualWrite, orchestrator.init
- Status: Deferred (requires test utility refactoring)

#### Tier B: In-Test vi.doMock() Patterns (20+ files)
- vi.doMock() called INSIDE test functions
- Examples: lexicalFallback.test.js, queryRag.test.js, vectorSearchPage/queryBuilding.test.js
- Status: Requires different migration strategy (per-test mock configuration)

#### Tier C: Already Migrated (several files)
- Already using top-level vi.mock() patterns
- Examples: battleEngineTimer.test.js, classicBattle/timer.test.js
- Status: ✅ Complete and passing

### 3. Key Discovery: In-Test vi.doMock() Pattern

**Pattern Found** (tests/queryRag/lexicalFallback.test.js example):
```javascript
test("fallback when embedder unavailable", async () => {
  // vi.doMock() called INSIDE the test function
  vi.doMock("../../src/helpers/api/vectorSearchPage.js", () => ({
    getExtractor: vi.fn(async () => {
      throw new Error("model failed to load");
    })
  }));
  
  const result = await query(...);
  expect(result).toBeDefined();
});
```

**Why This Is Different**:
- Cannot use simple configureXxxMock() approach from Session 9
- Each test needs per-test mock configuration
- Requires vi.hoisted() with per-test reset mechanism

**Correct Migration for This Pattern**:
```javascript
// Top-level hoisted for shared references
const { mockGetExtractor } = vi.hoisted(() => ({
  mockGetExtractor: vi.fn()
}));

vi.mock("../../src/helpers/api/vectorSearchPage.js", () => ({
  getExtractor: mockGetExtractor
}));

test("fallback when embedder unavailable", async () => {
  // Per-test configuration
  mockGetExtractor.mockImplementation(async () => {
    throw new Error("model failed to load");
  });
  
  const result = await query(...);
  expect(result).toBeDefined();
});
```

## Verification: Session 9 Still Passing

✅ **tests/helpers/classicBattle/opponentPromptWaiter.test.js** (9 tests) - PASSING  
✅ **tests/helpers/classicBattle/roundSelectModal.resize.test.js** (1 test) - PASSING  
✅ **tests/pages/battleCLI.helpers.test.js** (7 tests) - PASSING (reverted to original)

**Total**: 17 tests from Session 9 & verification, 100% pass rate, 0 regressions

## Current Status

| Category | Count | Status |
|----------|-------|--------|
| Files Migrated (Session 9) | 2 | ✅ Complete |
| Tests Passing from Migrations | 10 | ✅ Verified |
| Files with vi.doMock() Remaining | 31 | 📊 Analyzed |
| Tier A (Complex Helpers) | 5+ | 🔴 Deferred |
| Tier B (In-Test Patterns) | 20+ | 🟡 Requires New Strategy |
| Tier C (Already Migrated) | Several | ✅ Complete |

## Roadmap for Future Work

### Session 11+ Recommendations

1. **Priority 1 - In-Test Pattern Tier (Tier B)**:
   - 20+ files waiting with clear migration path identified
   - Create test helper like `setupPerTestMocks(mockConfig)` 
   - Could yield 40-50+ additional tests
   - Medium effort, high payoff

2. **Priority 2 - Complex Helper Tier (Tier A)**:
   - 5+ files with deep interdependencies
   - May require refactoring test utilities (loadBattleCLI, setupPage)
   - Deferred until Priority 1 complete

3. **Optional - Remaining Quick-Wins**:
   - ~8 candidate files still being used by ongoing development
   - Scan for any true 1-3 mock, standalone patterns
   - Likely to find 2-3 more quick-wins

## Technical Insights

### What Worked (Session 9)
- ✅ Simple helper function patterns (configureXxxMock)
- ✅ Shared vi.hoisted() state with per-test reset
- ✅ Files with minimal external dependencies
- ✅ ~10 tests from 2 files, zero regressions

### What Didn't Work (Session 10)
- ❌ Passing vi.fn to .mockImplementation() of another vi.fn
- ❌ Ignoring module-level test utility interdependencies
- ❌ Trying to migrate files with internal mocking from other utilities

### Key Learnings
1. vi.doMock() in helper functions DOES work in Vitest 3.x (contrary to initial assumption)
2. Not all vi.doMock() patterns justify migration effort
3. In-test vi.doMock() patterns require completely different strategy than helper function patterns
4. Test utility interdependencies are major complexity factor

## Files Verified Working

- ✅ tests/helpers/battleEngineTimer.test.js (1 mock, 4 tests)
- ✅ tests/classicBattle/timer.test.js (1 mock, 6 tests)
- ✅ tests/helpers/classicBattle/opponentPromptWaiter.test.js (9 tests) 
- ✅ tests/helpers/classicBattle/roundSelectModal.resize.test.js (1 test)
- ✅ tests/pages/battleCLI.helpers.test.js (7 tests)
- ✅ All verified with zero regressions

## Next Steps

1. ✅ Document findings in progressHarness.md (COMPLETED)
2. ⏭️ **Session 11**: Begin Tier B migration (in-test patterns, 20+ files)
3. ⏭️ **Session 12+**: Progress to Tier A complex patterns after Tier B complete

## Conclusion

Session 10 successfully mapped the remaining 31 files and identified two distinct migration patterns beyond Session 9's quick-win approach. While the battleCLI.helpers migration proved complex, the systematic analysis revealed a clear path forward with Tier B (in-test patterns) being the next logical step. The pattern is now understood and documented for efficient execution in future sessions.

**Success Metrics**:
- ✅ Pattern discovery complete
- ✅ Migration strategy identified for 20+ files
- ✅ Zero regressions on verified migrations
- ✅ Roadmap created for remaining work
