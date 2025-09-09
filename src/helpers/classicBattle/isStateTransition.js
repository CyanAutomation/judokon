/**
 * Determine whether the orchestrator transitioned from `from` to `to`.
 *
 * @param {string|null|undefined} from
 * @param {string} to
 * @returns {boolean}
 * @pseudocode
 * 1. Read `document.body.dataset.battleState` and `prevBattleState`.
 * 2. If `from` is null/undefined -> compare only current to `to`.
 * 3. Otherwise check `prev === from && current === to`.
 * 4. Return `false` on any error.
 */
export function isStateTransition(from, to) {
  try {
    if (typeof document === "undefined") return false;
    const current = document.body?.dataset.battleState;
    const prev = document.body?.dataset.prevBattleState;
    if (from === null || from === undefined) {
      return current === to;
    }
    return prev === from && current === to;
  } catch {
    return false;
  }
}

export default isStateTransition;
