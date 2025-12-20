/**
 * Minimal battle flow initializer used by integration tests.
 *
 * Reads the stored battle identifier from localStorage, stamps it onto the DOM
 * for downstream consumers, and triggers the network call used to resume or
 * hydrate the battle.
 *
 * @returns {Promise<{ battleId: string | null, response: any }>} Parsed result
 *   including the battle identifier and fetched payload.
 */
export async function initBattleFlowFromStorage() {
  if (typeof localStorage === "undefined") {
    return { battleId: null, response: null };
  }

  const battleId = localStorage.getItem("battleId");
  if (!battleId) {
    return { battleId: null, response: null };
  }

  if (typeof document !== "undefined" && document.body) {
    document.body.dataset.battleId = battleId;
  }

  const response = await fetch(`/api/battles/${battleId}`);
  const payload = typeof response?.json === "function" ? await response.json() : response;
  return { battleId, response: payload };
}
