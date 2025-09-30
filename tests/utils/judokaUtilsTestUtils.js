import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let judokaUtilsModuleId;

try {
  judokaUtilsModuleId = require.resolve("../../src/helpers/judokaUtils.js");
} catch (error) {
  // Vitest's module resolver will handle dynamic imports even if require.resolve fails.
  judokaUtilsModuleId = null;
}

/**
 * Dynamically imports the `getFallbackJudoka` helper from the source module.
 *
 * @returns {Promise<typeof import("../../src/helpers/judokaUtils.js")["getFallbackJudoka"]>}
 * The lazily imported `getFallbackJudoka` function.
 * @pseudocode
 * 1. Dynamically import the module containing `getFallbackJudoka`.
 * 2. Return the `getFallbackJudoka` export so tests can invoke it.
 */
export async function importGetFallbackJudoka() {
  const mod = await import("../../src/helpers/judokaUtils.js");
  return mod.getFallbackJudoka;
}

/**
 * Clears the CommonJS module cache entry for `judokaUtils`, if present.
 *
 * @returns {void}
 * @pseudocode
 * 1. If the module id was resolved and cached, delete it from `require.cache`.
 * 2. Allow Vitest to re-import a fresh copy of the module in subsequent tests.
 */
export function clearJudokaUtilsModuleCache() {
  if (judokaUtilsModuleId && require.cache[judokaUtilsModuleId]) {
    delete require.cache[judokaUtilsModuleId];
  }
}
