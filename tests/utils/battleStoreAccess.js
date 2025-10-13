/**
 * Retrieve the Classic Battle store using the supported public accessors.
 *
 * @pseudocode
 * 1. Prefer `window.__TEST_API.inspect.getBattleStore()` when available.
 * 2. Fall back to the classic battle debug API's `battleStore` reference.
 * 3. Lastly, return `window.battleStore` for legacy tooling support.
 * 4. Swallow any access errors and return null when the store cannot be read.
 *
 * @returns {ReturnType<import("../../src/helpers/classicBattle/roundManager.js").createBattleStore> | null}
 */
export function getBattleStore() {
  try {
    if (typeof window === "undefined") return null;

    const inspectStore = window.__TEST_API?.inspect?.getBattleStore?.();
    if (inspectStore) {
      return inspectStore;
    }

    const debugStore = window.__classicbattledebugapi?.battleStore;
    if (debugStore) {
      return debugStore;
    }

    return window.battleStore || null;
  } catch {
    return null;
  }
}
