# How to Address JSDoc Omissions

This guide provides a step-by-step workflow for correctly diagnosing and fixing JSDoc omissions, ensuring that all changes pass the project's validation scripts. We will use the recent fix for `resetSynonymCache` as a practical example.

## The Goal

The primary goal is to ensure every exported function and symbol has a complete and correctly formatted JSDoc block that satisfies the project's linter, `npm run check:jsdoc`.

## The Workflow

Fixing a JSDoc omission is an iterative process of refinement and validation.

### Step 1: Identify the Omission

The process begins when the validation script reports an error.

```bash
> npm run check:jsdoc

Functions missing or with incomplete JSDoc blocks:
 - src/helpers/queryExpander.js:251 -> resetSynonymCache
```

This message clearly identifies the file and function that needs attention.

### Step 2: Add a Descriptive JSDoc Block

Your first step should be to add a JSDoc block that describes the function's purpose. Based on the project's conventions, this should include:
- A clear summary of what the function does.
- A `@pseudocode` section explaining the implementation steps.

Initial attempt:
```javascript
/**
 * Resets the internal synonym cache and related state variables.
 * @pseudocode
 * 1. Set the global `synonymsCache` to `undefined`.
 * 2. Set the global `synonymsCachePromise` to `undefined`.
 * 3. Set the global `synonymCacheHits` counter to `0`.
 */
export function resetSynonymCache() {
  // ...
}
```

### Step 3: Validate and Analyze the Failure

After adding the JSDoc, run the validation script again.

```bash
> npm run check:jsdoc
...
Functions missing or with incomplete JSDoc blocks:
 - src/helpers/queryExpander.js:255 -> resetSynonymCache
```

If it still fails, **do not just guess**. The key to solving the issue is to understand the rules enforced by the tool.

### Step 4: Investigate the Validation Script

The most critical step is to **read the validation script** to understand its specific requirements. The relevant script is `scripts/check-jsdoc.mjs`.

By inspecting the `validateJsDoc` function within that file, we can learn the exact criteria for a "complete" JSDoc block. This includes checks for:
- A summary line.
- `@param` tags for every parameter.
- An `@returns` tag if the function returns a value.
- A `@pseudocode` tag for all functions.

### Step 5: Form a Hypothesis and Refine

The `resetSynonymCache` function takes no parameters and does not explicitly return a value. The investigation of the `check-jsdoc.mjs` script revealed a subtle but important convention: the script expects **every exported function** to have an `@returns` tag, even if it returns nothing.

This led to the final, successful hypothesis: the JSDoc block must explicitly state that nothing is returned.

### Step 6: Final Solution and Verification

The final step is to add the missing piece—the `@returns {void}` tag—and re-run the validation.

The passing JSDoc:
```javascript
/**
 * Resets the internal synonym cache and related state variables.
 * This function clears the in-memory cache of synonyms, forcing a fresh load
 * from the `synonyms.json` file on the next `loadSynonyms` call. This is useful
 * for testing, or when the underlying synonym data is known to have changed.
 *
 * @returns {void}
 * @pseudocode
 * 1. Set the global `synonymsCache` to `undefined`.
 * 2. Set the global `synonymsCachePromise` to `undefined`.
 * 3. Set the global `synonymCacheHits` counter to `0`.
 */
export function resetSynonymCache() {
  // ...
}
```

Running the check one last time yields success:
```bash
> npm run check:jsdoc

All exported symbols in src have valid JSDoc blocks.
```

## Key Takeaway

When a JSDoc-related check fails, the most efficient path to a solution is to **read the validation script itself**. Project-specific tooling often has unique conventions that may not be immediately obvious from general JSDoc standards. Understanding the tool's expectations is the surest way to resolve validation errors.
