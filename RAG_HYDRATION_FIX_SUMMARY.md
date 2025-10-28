# RAG Offline Hydration Fix

## Issue Identified

The offline RAG system was experiencing issues for users even after running `npm run rag:prepare:models`. The root cause was a **path configuration mismatch** between the model preparation script and the model loader.

### Root Cause

In `scripts/prepareLocalModel.mjs` (line 132):

```javascript
env.localModelPath = destDir; // ❌ WRONG: models/minilm
```

But in `src/helpers/api/vectorSearchPage.js` (line 65):

```javascript
env.localModelPath = rootDir; // ✅ CORRECT: repository root
```

**The Problem**: The prepare script was setting `env.localModelPath` to the **minilm directory** (`models/minilm`), but the loader expected it to be the **repository root** (`/workspaces/judokon`).

When Transformers.js loads models, it looks for them relative to `env.localModelPath`:

- If set to `models/minilm`, it looks for `models/minilm/models/minilm/...` (incorrect nesting)
- If set to repo root, it looks for `models/minilm/...` (correct)

This caused the local model to fail loading even though the files were present and valid.

## Solution Applied

Changed line 132 in `scripts/prepareLocalModel.mjs`:

```diff
- env.localModelPath = destDir;
+ env.localModelPath = destRoot;
```

This ensures the environment is configured consistently with how `vectorSearchPage.js` resolves the model path.

## Verification

All checks pass:

```bash
npm run check:rag
```

Output: All required MiniLM assets exist under models/minilm.

```bash
node -e "import queryRag from './src/helpers/queryRag.js'; await queryRag('test')"
```

Output: RAG: Successfully loaded local MiniLM model. Query succeeded.

## Impact

This fix ensures that:

1. Offline users can properly hydrate and use the local MiniLM model
2. Reproducible builds work correctly in isolated environments
3. No network fallback is needed when files are already present locally
4. RAG_STRICT_OFFLINE=1 mode works as intended

## Files Changed

- `scripts/prepareLocalModel.mjs` (1 line)

## Testing the Fix

Run this command to verify the local model works:

```bash
npm run rag:prepare:models -- --force
npm run check:rag
```

Then test a query:

```bash
node -e "import queryRag from './src/helpers/queryRag.js'; const r = await queryRag('tooltip system'); console.log('✅', r.length, 'results')"
```
