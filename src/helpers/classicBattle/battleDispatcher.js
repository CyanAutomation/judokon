/**
 * Dispatch a battle event using the orchestrator when available.
 *
 * @pseudocode
 * 1. Try to import `./orchestrator.js` and call its `dispatchBattleEvent` export.
 * 2. If import or call fails, obtain the live machine via `window.__getClassicBattleMachine` and dispatch on it.
 * 3. Swallow errors and return `undefined` when no dispatcher is available.
 *
 * @param {string} eventName - Event to dispatch.
 * @param {any} [payload] - Optional event payload.
 * @returns {Promise<any>} Result of the dispatch when available.
 */
export async function dispatchBattleEvent(eventName, payload) {
  // Prefer orchestrator export when it can be loaded (satisfies test spies)
  try {
    const orchestrator = await import("./orchestrator.js");
    if (orchestrator && typeof orchestrator.dispatchBattleEvent === "function") {
      if (payload === undefined) return await orchestrator.dispatchBattleEvent(eventName);
      return await orchestrator.dispatchBattleEvent(eventName, payload);
    }
  } catch {}
  // Fallback to the live machine when present
  try {
    if (typeof window !== "undefined") {
      const getMachine = window.__getClassicBattleMachine;
      const machine = typeof getMachine === "function" ? getMachine() : null;
      if (machine && typeof machine.dispatch === "function") {
        return await machine.dispatch(eventName, payload);
      }
    }
  } catch {}
}
