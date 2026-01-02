import { onBattleEvent, offBattleEvent } from "../battleEvents.js";
import { getAutoContinue } from "../autoContinue.js";
import { enableNextRoundButton } from "../uiHelpers.js";

/**
 * onEnter handler for `roundOver` state.
 *
 * @param {object} machine
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Clear the stored `playerChoice` while leaving selection flags intact for cooldown diagnostics.
 * 2. If autoContinue is disabled, enable the Next button for manual round progression.
 * 3. If `waitForOutcomeConfirmation` is true, wait for `outcomeConfirmed` event.
 */
export async function roundOverEnter(machine) {
  const store = machine?.context?.store;
  if (store) {
    store.playerChoice = null;
  }

  // Enable Next button for manual progression when autoContinue is disabled
  if (!getAutoContinue()) {
    try {
      enableNextRoundButton();
    } catch {
      // Ignore UI errors in test environments where DOM may not be fully available
    }
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

    // Verify state hasn't changed after async outcome confirmation (race condition guard)
    const currentState = machine.getState ? machine.getState() : null;
    if (currentState !== "roundOver") {
      // State has moved on, exit gracefully
      return;
    }
  }
}

export default roundOverEnter;
