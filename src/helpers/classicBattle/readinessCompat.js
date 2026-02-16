/**
 * @deprecated Legacy readiness globals are maintained only for test compatibility.
 * New code should use module-level `readyPromise` values from battle factories.
 */

/**
 * @returns {boolean} True when compatibility globals should be exposed.
 */
function shouldExposeLegacyReadiness() {
  if (typeof window === "undefined") {
    return false;
  }

  if (typeof process !== "undefined") {
    return process.env?.VITEST === "true" || process.env?.NODE_ENV === "test";
  }

  return Boolean(globalThis.__TEST__);
}

/**
 * Mirror readiness onto deprecated globals for tests that have not migrated yet.
 *
 * @deprecated Prefer awaiting factory/module `readyPromise` directly.
 *
 * @param {Promise<unknown>} readyPromise - Promise resolved when classic battle init completes.
 * @pseudocode
 * 1. Exit unless running in a recognized test context with a window object.
 * 2. Expose the provided promise on `window.battleReadyPromise` for legacy tests.
 * 3. Mirror promise settlement to deprecated `window.__battleInitComplete` flag.
 *
 * @returns {void}
 */
export function exposeLegacyReadinessForTests(readyPromise) {
  if (!shouldExposeLegacyReadiness()) {
    return;
  }

  window.battleReadyPromise = readyPromise;
  delete window.__battleInitComplete;

  readyPromise
    .then(() => {
      window.__battleInitComplete = true;
    })
    .catch(() => {
      window.__battleInitComplete = false;
    });
}
