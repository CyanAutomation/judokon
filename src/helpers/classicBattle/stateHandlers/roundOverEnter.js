import { onBattleEvent, offBattleEvent } from "../battleEvents.js";

/**
 * onEnter handler for `roundOver` state.
 *
 * @param {object} machine
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Clear the stored `playerChoice` so the next round can record a fresh selection.
 * 2. If `waitForOutcomeConfirmation` is true, wait for `outcomeConfirmed` event.
 */
export async function roundOverEnter(machine) {
  const store = machine?.context?.store;
  if (store) {
    store.playerChoice = null;
  }

  // If configured to wait for outcome confirmation, pause here until user confirms
  if (machine?.context?.waitForOutcomeConfirmation) {
    await new Promise((resolve) => {
      const handler = () => {
        offBattleEvent("outcomeConfirmed", handler);
        resolve();
      };
      onBattleEvent("outcomeConfirmed", handler);
    });
  }
}

export default roundOverEnter;
