/**
 * onEnter handler for `matchEvaluate` state.
 *
 * @param {import("../stateManager.js").ClassicBattleStateManager} machine
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Read scores and win target from the battle engine.
 * 2. Decide whether the match has ended.
 * 3. Dispatch `evaluateMatch` to move to matchDecision or back to roundWait.
 */
export async function matchEvaluateEnter(machine) {
  if (!machine || typeof machine.dispatch !== "function") return;

  try {
    await machine.dispatch("evaluateMatch");
  } catch (error) {
    console.error("Failed to dispatch evaluateMatch:", error);
    // Consider fallback behavior or re-throwing based on requirements
  }
}

export default matchEvaluateEnter;
