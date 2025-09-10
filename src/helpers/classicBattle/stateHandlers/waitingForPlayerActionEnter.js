import { emitBattleEvent } from "../battleEvents.js";
import { startTimer } from "../timerService.js";
import { handleStatSelection } from "../selectionHandler.js";
import { getCardStatValue } from "../cardStatUtils.js";
import { getOpponentJudoka } from "../cardSelection.js";

/**
 * onEnter handler for `waitingForPlayerAction` state.
 *
 * Implements the documented state contract:
 * - "prompt:chooseStat" → enables stat buttons
 * - "timer:startStatSelection" → starts round timer with timeout handling
 * - "a11y:exposeTimerStatus" → enables timer accessibility
 *
 * @param {object} machine - State machine instance with context.store
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Enable stat buttons via battle event.
 * 2. Start round timer with auto-select callback that handles stat selection.
 * 3. Timer will emit "roundTimeout" on expiry and dispatch "timeout" to state machine.
 */
export async function waitingForPlayerActionEnter(machine) {
  // prompt:chooseStat - Enable stat buttons
  emitBattleEvent("statButtons:enable");

  // timer:startStatSelection - Start round timer with timeout callback
  const store = machine?.context?.store;
  if (store) {
    await startTimer(async (stat, opts) => {
      // Get card values for the auto-selected stat
      const playerCard = document.querySelector("[data-role='player-card']");
      const opponentCard = document.querySelector("[data-role='opponent-card']");

      const playerVal = getCardStatValue(playerCard, stat);
      let opponentVal = getCardStatValue(opponentCard, stat);

      try {
        const opp = getOpponentJudoka();
        const raw = opp && opp.stats ? Number(opp.stats[stat]) : NaN;
        opponentVal = Number.isFinite(raw) ? raw : opponentVal;
      } catch {}

      // Handle the stat selection via the normal selection handler
      return handleStatSelection(store, stat, { playerVal, opponentVal, ...opts });
    }, store);
  }

  // a11y:exposeTimerStatus - Timer accessibility is handled by timerService
  // when it updates the scoreboard timer display
}

export default waitingForPlayerActionEnter;
