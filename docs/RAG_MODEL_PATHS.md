# RAG Model Path Resolution Guide

## Overview

This guide explains how the JU-DO-KON! RAG system resolves model paths for the MiniLM embedding model. Understanding this is critical for offline mode operation and debugging path-related issues.

---

## Core Concept

The RAG system uses a **repository root-based path resolution strategy**:

```
env.localModelPath = <repository_root>
                ↓
    Resolves to: <repository_root>/models/minilm/config.json
                ↓
    ✅ Model files found and loaded
```

---

## Path Resolution Chain

### Step 1: Configuration

Both the model preparation script and the loader set the same configuration:

**Preparation Script** (`scripts/prepareLocalModel.mjs`):

```javascript
const destRoot = path.resolve(__dirname, "..");  // Repository root
env.localModelPath = destRoot;                   // Set to repo root
```

**Loader** (`src/helpers/api/vectorSearchPage.js`):

```javascript
const rootDir = resolve(moduleDir, "..", "..", "..");  // Repository root
env.localModelPath = rootDir;                          // Set to repo root
```

### Step 2: Model Resolution

When Transformers.js loads the model, it resolves paths **relative to** `env.localModelPath`:

```
Transformers.js resolution:
  env.localModelPath = /workspaces/judokon
         +
       "models/minilm"
         ↓
  Full path: /workspaces/judokon/models/minilm/config.json
```

### Step 3: Expected Directory Structure

```
judokon/
├── models/
│   └── minilm/
│       ├── config.json
│       ├── tokenizer.json
│       ├── tokenizer_config.json
│       └── onnx/
│           └── model_quantized.onnx
├── scripts/
│   ├── prepareLocalModel.mjs
│   ├── validateRagConfig.mjs
│   └── ragHealth.mjs
├── src/
│   └── helpers/
│       └── api/
│           └── vectorSearchPage.js
└── ...
```

---

## Common Issues and Solutions

### Issue 1: "Model files not found" in offline mode

**Symptoms:**

- Local model files exist but system can't find them
- Error: "config.json not found"
- Falls back to CDN even with all files present

**Root Cause:**
`env.localModelPath` set to `models/minilm` instead of repository root.

**Solution:**

1. Verify path configuration:

   ```bash
   npm run validate:rag:config
   ```

2. Check that both files use **repository root**:
   - `scripts/prepareLocalModel.mjs`: Line 132 should have `env.localModelPath = destRoot`
   - `src/helpers/api/vectorSearchPage.js`: Line 105 should have `env.localModelPath = rootDir`

3. If not fixed, update the configuration:

   ```javascript
   // ✅ Correct
   env.localModelPath = destRoot;  // or rootDir - both are repo root

   // ❌ Incorrect
   env.localModelPath = "models/minilm";  // relative path
   env.localModelPath = destDir;          // wrong variable
   ```

### Issue 2: Model files are placeholders (wrong size)

**Symptoms:**

- Error: "MiniLM assets appear to be placeholders"
- File sizes are very small (< expected minimum)

**Root Cause:**
Model files weren't fully downloaded or cached.

**Solution:**
Re-prepare the model with force flag:

```bash
# From directory with complete model files
npm run rag:prepare:models -- --from-dir /path/to/complete/minilm

# Or re-download from network
npm run rag:prepare:models -- --force
```

Expected file sizes:

- `config.json`: ~650 bytes (min: 400 bytes)
- `tokenizer.json`: ~710 KB (min: 1 KB)
- `tokenizer_config.json`: ~366 bytes (min: 300 bytes)
- `onnx/model_quantized.onnx`: ~23 MB (min: 300 KB)

### Issue 3: Offline mode fails with exact paths unknown

**Symptoms:**

- `RAG_STRICT_OFFLINE=1` mode fails
- Error message doesn't show which files are missing

**Solution:**
Run enhanced error checking:

```bash
# Check which files are missing
npm run check:rag

# Get detailed health diagnostics
npm run rag:health

# Validate configuration paths
npm run validate:rag:config
```

---

## Validation and Diagnostics

### 1. Validate Configuration Consistency

Ensures both preparation and loading scripts use compatible path configuration:

```bash
npm run validate:rag:config
```

Output:

```
✅ RAG Configuration Validation

Configuration Summary:
  [✓] Preparation script: env.localModelPath = destRoot
  [✓] Loader: env.localModelPath = rootDir

Result: ✓ RAG configuration is correct!
```

### 2. Check Model Health

Comprehensive system diagnostics:

```bash
npm run rag:health
```

Output includes:

- ✅ Local model status and file sizes
- ✅ Configuration validation
- ✅ RAG functionality test
- ✅ Offline mode readiness
- ✅ Recommendations if issues found

### 3. Verify Model Files

Check that all required files exist with correct sizes:

```bash
npm run check:rag
```

---

## Offline Mode Setup

### Quick Start

1. **Prepare the local model:**

   ```bash
   npm run rag:prepare:models
   ```

2. **Verify setup:**

   ```bash
   npm run rag:health
   ```

3. **Enable strict offline mode:**

   ```bash
   RAG_STRICT_OFFLINE=1 npm run test
   ```

### Manual Setup (air-gapped environments)

If you have limited network access:

1. **Copy model files from another machine:**

   ```bash
   # On source machine with internet
   npm run rag:prepare:models
   
   # Copy the models/minilm directory to target
   cp -r models/minilm /path/to/transport/
   ```

2. **On target machine (offline):**

   ```bash
   npm run rag:prepare:models -- --from-dir /path/to/transported/minilm
   ```

3. **Verify offline operation:**

   ```bash
   RAG_STRICT_OFFLINE=1 npm run rag:health
   ```

---

## Path Variables Reference

### In `scripts/prepareLocalModel.mjs`

| Variable | Value | Purpose |
|----------|-------|---------|
| `__dirname` | `scripts/` | Directory of this file |
| `rootDir` (aliased as `destRoot`) | Repository root | Base for all paths |
| `destDir` | `models/minilm` | Where model files land |
| `cacheDir` | `models/` | Cache directory for Transformers.js |
| `env.localModelPath` | `rootDir` | ✅ **Correct** - repo root |

### In `src/helpers/api/vectorSearchPage.js`

| Variable | Value | Purpose |
|----------|-------|---------|
| `moduleDir` | `src/helpers/api/` | Directory of this file |
| `rootDir` | Repository root | Base for all paths |
| `modelDir` | `models/minilm` | Relative path to model |
| `modelDirAbs` | `<rootDir>/models/minilm` | Absolute path |
| `env.localModelPath` | `rootDir` | ✅ **Correct** - repo root |

---

## How Path Resolution Works

### Example 1: Local Model Loading (Offline)

```
Repository: /workspaces/judokon

1. env.localModelPath = /workspaces/judokon
2. modelDir = "models/minilm"
3. Transformers.js resolves:
   /workspaces/judokon/models/minilm/config.json ✅ Found
   /workspaces/judokon/models/minilm/tokenizer.json ✅ Found
   /workspaces/judokon/models/minilm/onnx/model_quantized.onnx ✅ Found

Result: Local model loads successfully
```

### Example 2: Wrong Configuration (Bug)

```
Repository: /workspaces/judokon

1. env.localModelPath = models/minilm  ❌ Wrong!
2. modelDir = "models/minilm"
3. Transformers.js resolves:
   models/minilm/models/minilm/config.json ❌ NOT FOUND (double nesting)

Result: Falls back to CDN
```

---

## Environment Variables

### `RAG_STRICT_OFFLINE=1`

Enables strict offline mode - system will fail fast if local model unavailable.

```bash
RAG_STRICT_OFFLINE=1 npm run test
# ✅ Works if local model available
# ❌ Fails with clear error if not
```

### `RAG_ALLOW_LEXICAL_FALLBACK=1`

Allows fallback to lexical search if embedding model unavailable.

```bash
RAG_ALLOW_LEXICAL_FALLBACK=1 npm run test
# Falls back to simple text search if embedding fails
```

---

## Troubleshooting Workflow

```
┌─ Start here
│
├─ Run: npm run rag:health
│  ├─ ✅ All green? Done!
│  └─ ❌ Issues found? Continue...
│
├─ Run: npm run validate:rag:config
│  ├─ ✅ Configuration valid? Continue...
│  └─ ❌ Configuration issues? Fix them, then continue...
│
├─ Run: npm run check:rag
│  ├─ ✅ All files found? Continue...
│  └─ ❌ Missing files? Re-prepare:
│     npm run rag:prepare:models -- --force
│
├─ Check file sizes manually:
│  ls -lh models/minilm/
│  ls -lh models/minilm/onnx/
│  ├─ ✅ Sizes look reasonable? Enable debug:
│  │  npm run rag:health 2>&1
│  └─ ❌ Sizes too small? Re-download:
│     npm run rag:prepare:models -- --force
│
└─ Enable debug logging and test:
   DEBUG=* RAG_STRICT_OFFLINE=1 npm run test -- <spec>
```

---

## Key Insights

1. **Repository Root is Key**: `env.localModelPath` must be the repository root, not a subdirectory
2. **Consistency Matters**: Both preparation and loading must use the same root reference
3. **Validation is Your Friend**: Always run `npm run validate:rag:config` when debugging
4. **Health Checks Work**: `npm run rag:health` provides comprehensive diagnostics
5. **Offline Mode is Strict**: `RAG_STRICT_OFFLINE=1` fails fast if model unavailable (good for debugging!)

---

## Related Files

- `scripts/prepareLocalModel.mjs` - Model preparation script
- `scripts/validateRagConfig.mjs` - Configuration validation script
- `scripts/ragHealth.mjs` - System health check script
- `src/helpers/api/vectorSearchPage.js` - Model loading logic
- `src/helpers/queryRag.js` - RAG query interface

---

## See Also

- `OFFLINE_RAG_INVESTIGATION_REPORT.md` - Original bug investigation
- `PR_OFFLINE_RAG_FIX.md` - Fix documentation and task contract
- `AGENTS.md` - Agent guidelines and RAG policy
