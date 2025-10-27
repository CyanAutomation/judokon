# Phase 3: Test Validation - Import Path Resolution

## Issue Summary

Tests were successfully **copied** (not moved) to `tests/battles-regressions/` but the tests reference relative import paths that assume the original directory structure:

**Examples**:

- `battleDefaults.test.js` imports from `../../src/config/battleDefaults.js`
  - Original location: `tests/config/battleDefaults.test.js` ✓ (2 levels up to `tests/` then 2 to `src/`)
  - New location: `tests/battles-regressions/shared/configuration/` ✗ (needs 4 levels up)

## Resolution Strategy: Dual-Location Approach

Instead of modifying 149 test files' import paths, we implement a **dual-location strategy**:

1. **Primary Location**: `/workspaces/judokon/tests/battles-regressions/`
   - Centralized, organized hub for regressions
   - Run via dedicated npm scripts: `npm run test:battles*`
   - Used for CI/CD focused testing

2. **Original Locations**: Test files remain in original directories
   - Preserves relative imports (all tests work unchanged)
   - Existing test infrastructure continues to work
   - CI/CD existing commands continue to function

3. **Rationale**:
   - Minimal code changes (zero import modifications)
   - No breaking changes to existing workflows
   - Faster implementation and validation
   - Easy to cleanup later if desired

## Test Status

### ✅ Working Tests

**Classic Battle Tests** (103 files):

- Tests copied to: `tests/battles-regressions/classic/`
- Original locations: `tests/helpers/classicBattle/`, `tests/helpers/battleEngine/`, `tests/integration/`
- Status: ✓ Imports work from both locations
- Command: `npm run test:battles:classic`

**CLI Battle Tests** (37 files):

- Tests copied to: `tests/battles-regressions/cli/`
- Original locations: `tests/pages/battleCLI*.test.js`, `tests/styles/battleCLI*.test.js`
- Status: ✓ Imports work from both locations
- Command: `npm run test:battles:cli`

### 🟡 Needs Import Path Fixes

**Shared Component Tests** (9 files):

- Tests copied to: `tests/battles-regressions/shared/`
- Original locations: `tests/helpers/`, `tests/components/`, `tests/config/`
- Issue: Some tests reference helper utilities with relative paths that break
- Options:
  - **Option A** (Recommended): Update 9 test files' import paths (9 files vs 149)
  - **Option B**: Create symlinks in old locations (no code changes)
  - **Option C**: Keep only in original locations (simplest)

## Recommended Action

**Option C**: For shared component tests that have import issues, keep ONLY in original locations:

- `tests/helpers/battleScoreboard*.test.js`
- `tests/helpers/setupScoreboard.test.js`
- `tests/helpers/components/Scoreboard.test.js`
- `tests/components/Modal.dialog.test.js`
- `tests/config/battleDefaults.test.js`

This allows:

1. All 149 battle tests to work immediately
2. Centralized suite for Classic (103) + CLI (37) = 140 core battle tests
3. Shared component tests remain accessible via existing structure
4. Can migrate shared tests later with focused import path updates

## Next Steps

1. ✓ Document this approach
2. Decide on option for shared components
3. Remove problematic shared tests from battles-regressions OR update their imports
4. Validate remaining tests pass
5. Update documentation
