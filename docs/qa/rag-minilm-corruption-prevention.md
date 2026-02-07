# RAG MiniLM Corruption Prevention & Recovery

## Problem Summary

The MiniLM embedding model files occasionally become corrupted, appearing as "stub files" with only metadata instead of actual model data:

```
❌ Corrupted state:
  - config.json: 16 bytes (contains: {"from":"cache"})
  - tokenizer.json: 2 bytes
  - tokenizer_config.json: 2 bytes
  - onnx/model_quantized.onnx: 3 bytes

✅ Healthy state:
  - config.json: 650 bytes
  - tokenizer.json: 695 KB
  - tokenizer_config.json: 366 bytes
  - onnx/model_quantized.onnx: 23 MB
```

## Root Causes

### 1. **Interrupted Downloads**

When the Xenova/transformers library downloads model files and the process is interrupted (network failure, process crash, disk full), it can leave stub files or metadata-only files in the cache directory (`models/Xenova/all-MiniLM-L6-v2/`).

### 2. **Stale Cache Reuse**

The `populateFromCache()` function copies files from the Xenova cache to `models/minilm/`. If the source cache is corrupted, the destination becomes corrupted too.

### 3. **Multiple Concurrent Processes**

Race conditions can occur if multiple processes try to download/cache the model simultaneously, causing partial writes.

### 4. **Filesystem Issues**

Rare cases of incomplete file writes due to system resource constraints or filesystem issues.

## Prevention & Detection

### Automatic Prevention (Pre-commit Hook)

The `.husky/pre-commit` hook now includes **pre-flight cache validation** that:

1. **Detects corrupted Xenova cache** - Checks if files are suspiciously small (stubs)
2. **Cleans stale cache** - Removes corrupted `models/Xenova/all-MiniLM-L6-v2/` directory
3. **Forces clean re-download** - Next `rag:prepare:models` will download fresh files
4. **Auto-repairs on commit** - If model files are corrupted, automatically runs repair

### Cache Integrity Validation

The `scripts/prepareLocalModel.mjs` now includes `validateCacheIntegrity()` function that:

- Checks all required files exist
- Detects files that are suspiciously small (< expected minimum)
- Returns detailed issue list for diagnostic purposes
- Prevents corrupted cache from being used

```javascript
// Minimum file sizes that indicate corruption
- onnx/model_quantized.onnx: < 1,000,000 bytes (1 MB)
- tokenizer.json: < 100,000 bytes (100 KB)
- config.json: < 400 bytes
- tokenizer_config.json: < 300 bytes
```

## How the Fix Works

### When Corruption is Detected

```
User runs: npm run rag:prepare:models
                          ↓
         Check local models/minilm/
                          ↓
      Are they corrupted? → YES
                          ↓
      Check Xenova cache (models/Xenova/all-MiniLM-L6-v2/)
                          ↓
      Is cache valid? → NO (stub files detected)
                          ↓
      🗑️  Remove corrupted cache directory
                          ↓
      🔄 Transformers downloads fresh files from CDN
                          ↓
      ✅ Copy fresh files to models/minilm/
                          ↓
      ✓ All validations pass
```

### Detection Logic

```javascript
// File size thresholds for detection
const isSuspiciouslySmall = (filename, size) => {
  if (filename.endsWith(".onnx")) return size < 1000000; // < 1 MB = stub
  if (filename === "tokenizer.json") return size < 100000; // < 100 KB = stub
  if (filename === "config.json") return size < 400; // < 400 bytes = stub
  if (filename === "tokenizer_config.json") return size < 300; // < 300 bytes = stub
  return false;
};
```

## Manual Recovery Steps

If corruption still occurs, follow these steps:

### Step 1: Identify the Problem

```bash
# Check file sizes
ls -lh models/minilm/
ls -lh models/Xenova/all-MiniLM-L6-v2/

# Run diagnostics
npm run check:rag
npm run rag:health
```

### Step 2: Clean Everything

```bash
# Remove all corrupted model caches
rm -rf models/minilm/
rm -rf models/Xenova/

# Re-download fresh
npm run rag:prepare:models -- --force
```

### Step 3: Verify

```bash
# Validate the new installation
npm run check:rag
npm run rag:validate

# Test RAG functionality
npm run rag:health
```

## Testing the Fix

To test the corruption detection:

```bash
# Create corrupted stub files (simulating interrupted download)
echo '{"from":"cache"}' > models/Xenova/all-MiniLM-L6-v2/config.json
echo 'X' > models/Xenova/all-MiniLM-L6-v2/tokenizer.json

# Run prep - should detect and clean cache
npm run rag:prepare:models

# Verify files are restored to correct sizes
ls -lh models/minilm/
```

## Environment Variables for Testing

### Strict Offline Mode (Fail Fast)

```bash
RAG_STRICT_OFFLINE=1 npm run rag:prepare:models
# Will fail immediately if local model unavailable (good for CI)
```

### Allow Lexical Fallback (Graceful Degradation)

```bash
RAG_ALLOW_LEXICAL_FALLBACK=1 npm run rag:prepare:models
# Falls back to simple text search if embedding unavailable
```

## CI/CD Integration

RAG validation is no longer a required GitHub Actions check in this repository.

If you need to troubleshoot RAG model corruption locally, run the verification commands manually:

1. `npm run rag:prepare:models`
2. `npm run check:rag`
3. `npm run rag:health`

## Monitoring for Recurrence

Watch for these warning signs:

### In Pre-commit Hook Output

```
Pre-flight: Checking for corrupted Xenova cache...
  Detected corrupted Xenova cache (stub files), removing...
```

### In npm Output

```
[RAG] Xenova cache is corrupted. Removing stale cache to force clean re-download...
```

### In Test Failures

```
Model file is missing or empty after hydration attempt
File size mismatch after copy
```

If these appear frequently, check:

- Disk space availability
- Network stability (if downloading from CDN)
- Filesystem health
- Concurrent access issues (if multiple processes accessing models)

## Key Validation Thresholds

These thresholds detect stub files created by interrupted downloads:

```json
{
  "validation_thresholds": {
    "onnx_model_min_bytes": 1000000,
    "tokenizer_min_bytes": 100000,
    "config_min_bytes": 400,
    "tokenizer_config_min_bytes": 300,
    "reason": "Files smaller than these are stubs from interrupted downloads"
  }
}
```

## See Also

- `scripts/prepareLocalModel.mjs` - Model preparation with corruption detection
- `.husky/pre-commit` - Pre-commit hook with cache validation
- `AGENTS.md` - Agent guide with RAG policy
- `docs/RAG_MODEL_PATHS.md` - Model path resolution guide
