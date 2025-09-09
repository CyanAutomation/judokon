/**
 * onEnter handler for `roundOver` state.
 *
 * @param {object} machine
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Clear `playerChoice` and `selectionMade` on store.
 */
export async function roundOverEnter(machine) {
  const store = machine?.context?.store;
  if (store) {
    store.playerChoice = null;
    store.selectionMade = false;
  }
}

export default roundOverEnter;
