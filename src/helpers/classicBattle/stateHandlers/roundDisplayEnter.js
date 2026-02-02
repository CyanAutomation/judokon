import { onBattleEvent, offBattleEvent } from "../battleEvents.js";
import { getAutoContinue } from "../autoContinue.js";
import { enableNextRoundButton } from "../uiHelpers.js";
import { withStateGuard } from "../stateGuards.js";

/**
 * onEnter handler for `roundDisplay` state.
 *
 * @param {object} machine
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Clear the stored `playerChoice` while leaving selection flags intact for cooldown diagnostics.
 * 2. If autoContinue is disabled, enable the Next button for manual round progression.
 * 3. If `waitForOutcomeConfirmation` is true, wait for `outcomeConfirmed` event.
 */
export async function roundDisplayEnter(machine) {
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

    // Verify state hasn't regressed after async outcome confirmation (race condition guard)
    // Allow progression to cooldown or matchDecision (normal flow)
    withStateGuard(
      machine,
      ["roundDisplay", "roundWait", "matchDecision"],
      () => {
        // State is valid, confirmation complete
        // Handler will naturally exit after this check
      },
      {
        debugContext: "roundDisplayEnter.postOutcomeConfirmation"
      }
    );
  }
}

export default roundDisplayEnter;
