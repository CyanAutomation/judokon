# Offline RAG Model Loading Fix - PR Summary

## Overview

This PR resolves a critical path configuration bug that prevented offline MiniLM model loading in the RAG system. The fix ensures that both the model preparation script and the loader use consistent path resolution, enabling reliable offline operation.

**Related Issue:** See `OFFLINE_RAG_INVESTIGATION_REPORT.md` for detailed investigation

---

## Task Contract

```json
{
  "inputs": [
    "scripts/prepareLocalModel.mjs",
    "src/helpers/api/vectorSearchPage.js",
    "tests/queryRag/"
  ],
  "outputs": [
    "scripts/prepareLocalModel.mjs (fix applied)",
    "tests/queryRag/offlineMode.test.js (new comprehensive test suite)"
  ],
  "success": [
    "eslint: PASS",
    "vitest: PASS",
    "jsdoc: PASS",
    "no_unsilenced_console",
    "npm run check:rag: PASS"
  ],
  "errorMode": "ask_on_public_api_change"
}
```

---

## Problem Statement

### Initial Symptoms

- Users running `npm run rag:prepare:models` successfully downloaded model files
- However, when attempting to use RAG in offline mode, the system couldn't load the local MiniLM model
- System would fall back to CDN even with all model files present and `RAG_STRICT_OFFLINE=1` enabled

### Root Cause

**Incorrect path configuration in `scripts/prepareLocalModel.mjs` line 132:**

```javascript
**Incorrect path configuration in `scripts/prepareLocalModel.mjs` line 132:**

```javascript
// ❌ INCORRECT (before)
env.localModelPath = destDir;  // Sets to: models/minilm

// ✅ CORRECT (after)
env.localModelPath = destRoot;  // Sets to: /repo/root
```

**Why This Mattered:**
Transformers.js resolves model paths **relative to** `env.localModelPath`:

- **With incorrect config (`destDir` = `models/minilm`)**:
  - Loader looks for: `models/minilm/models/minilm/config.json` ❌
  - File actually at: `models/minilm/config.json` ✅
  - Result: **File not found error**

- **With correct config (`destRoot` = repo root)**:
  - Loader looks for: `models/minilm/config.json` ✅
  - File actually at: `models/minilm/config.json` ✅
  - Result: **Successful load**

### Code Changes

**File: `scripts/prepareLocalModel.mjs`** (1 line fix)

```diff
  env.allowLocalModels = true;
  env.cacheDir = cacheDir;
- env.localModelPath = destDir;
+ env.localModelPath = destRoot;
```

This ensures the model preparation script uses the same base path as the loader, enabling correct path resolution for the MiniLM model files.

### Why This Fix Works

Both the preparation script (`prepareLocalModel.mjs`) and the loader (`vectorSearchPage.js`) now use consistent path configuration:

```text
env.localModelPath = repo_root
       ↓
    Resolves to: repo_root/models/minilm/config.json
       ↓
    ✅ Model files found and loaded successfully
```

---

## Testing

### New Test Suite: `tests/queryRag/offlineMode.test.js`

Added comprehensive test coverage for offline RAG mode:

1. **Test 1**: Verifies local MiniLM model loads when `models/minilm/` exists
2. **Test 2**: Confirms queryRag returns results in offline mode (happy path)
3. **Test 3**: Validates strict offline mode fails gracefully when model missing
4. **Test 4**: Ensures no network requests when local model available
5. **Test 5**: Tests lexical fallback when `RAG_ALLOW_LEXICAL_FALLBACK=1`
6. **Test 6**: Verifies consistent model path resolution between prepare and load
7. **Test 7**: Confirms diagnostic info is available in offline mode

### Validation Commands

```bash
# Run the new offline RAG tests
npm run test -- tests/queryRag/offlineMode.test.js

# Run all RAG tests
npm run test -- tests/queryRag/

# Full validation before commit
npm run check:jsdoc && npx prettier . --check && npx eslint . && npm run test:ci && npm run check:rag
```

### Verification Checklist

- ✅ Models prepare successfully: `npm run rag:prepare:models`
- ✅ Models are found: `npm run check:rag`
- ✅ Offline mode works: `RAG_STRICT_OFFLINE=1 npm test`
- ✅ Lexical fallback works: `RAG_ALLOW_LEXICAL_FALLBACK=1 npm test`
- ✅ No dynamic imports in hot paths
- ✅ No unsilenced console logs
- ✅ All tests passing

---

### Who Benefits

- 👥 **Developers** running in offline environments
- 👥 **CI/CD pipelines** in air-gapped networks
- 👥 **Teams** with unstable internet connections
- 👥 **Organizations** in restricted network environments

### What's Fixed

1. **Offline Mode**: ✅ Local MiniLM model now loads correctly without network dependency
2. **Reproducible Builds**: ✅ No network required when model files present
3. **Performance**: ✅ No unnecessary CDN fallback attempts
4. **Reliability**: ✅ `RAG_STRICT_OFFLINE=1` mode now fully functional

### Before & After

**Before this fix:**

```bash
$ npm run rag:prepare:models
✅ Models downloaded

$ npm run check:rag
✅ Files present

$ queryRag('tooltip')
⚠️ Falls back to CDN (network required)
❌ Offline mode doesn't work
```

**After this fix:**

```bash
$ npm run rag:prepare:models
✅ Models downloaded

$ npm run check:rag
✅ Files present

$ RAG_STRICT_OFFLINE=1 queryRag('tooltip')
✅ Uses local model
✅ No network required
✅ Offline mode works reliably
```

---

## Files Changed

| File                              | Type   | Change                               | Lines |
| --------------------------------- | ------ | ------------------------------------ | ----- |
| `scripts/prepareLocalModel.mjs`   | Fix    | Correct env.localModelPath config    | 1     |
| `tests/queryRag/offlineMode.test.js` | New    | Comprehensive offline RAG test suite | 285   |

---

## Backwards Compatibility

✅ **Fully backwards compatible**

- Existing online mode unaffected (still uses CDN when network available)
- Existing offline tests continue to pass
- No public API changes
- No configuration changes required

---

## Risk Analysis

### Low Risk ✅

- **Scope**: Single-line fix to model path configuration
- **Testing**: Comprehensive test suite added
- **Impact**: Only affects offline RAG operations
- **Rollback**: Can revert instantly if issues found

### Mitigation

- ✅ New automated tests prevent regressions
- ✅ Offline mode now has explicit test coverage
- ✅ Path configuration validated in tests
- ✅ CI/CD pipeline will catch any issues

---

## Documentation

Related documentation updated:

- `OFFLINE_RAG_INVESTIGATION_REPORT.md` - Detailed investigation and solution
- `AGENTS.md` - Agent guidelines already reference RAG setup
- `tests/queryRag/offlineMode.test.js` - Inline test documentation

---

## Commands for Reviewers

**To verify this fix:**

```bash
# 1. Run the new test suite
npm run test -- tests/queryRag/offlineMode.test.js

# 2. Verify model preparation
npm run rag:prepare:models

# 3. Check RAG health
npm run check:rag

# 4. Test offline mode
RAG_STRICT_OFFLINE=1 npm run test -- tests/queryRag/

# 5. Full validation
npm run test:ci && npm run check:jsdoc && npx prettier . --check && npx eslint .
```

---

## Conclusion

This PR fixes a critical offline RAG loading bug with a single-line path configuration correction, backed by comprehensive automated tests. The fix enables reliable offline operation while maintaining full backwards compatibility and introducing new test coverage to prevent future regressions.

### Key Points

- 🔧 **Fix**: Correct path configuration (`destRoot` instead of `destDir`)
- 🧪 **Tests**: 7 new tests covering offline mode scenarios
- ✅ **Verification**: All validation passes
- 🛡️ **Safety**: Backwards compatible, low risk
- 📊 **Coverage**: Offline RAG now has explicit test coverage

---

## Related Issues & PRs

- Investigation: `OFFLINE_RAG_INVESTIGATION_REPORT.md`
- Recommendations: See "Tier 2: High Priority" follow-up actions
