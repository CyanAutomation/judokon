import { emitBattleEvent } from "../battleEvents.js";
import { startTimer } from "../timerService.js";
import { handleStatSelection } from "../selectionHandler.js";
import { getCardStatValue } from "../cardStatUtils.js";
import { getOpponentJudoka } from "../cardSelection.js";
import {
  logStateHandlerEnter,
  logStateHandlerExit,
  createComponentLogger
} from "../debugLogger.js";

const stateLogger = createComponentLogger("WaitingForPlayerAction");

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
  // Debug logging for state handler entry
  logStateHandlerEnter("waitingForPlayerAction", machine?.currentState, {
    hasStore: !!machine?.context?.store,
    storeState: machine?.context?.store
      ? {
          selectionMade: machine.context.store.selectionMade,
          roundsPlayed: machine.context.store.roundsPlayed
        }
      : null
  });

  // prompt:chooseStat - Enable stat buttons
  emitBattleEvent("statButtons:enable");

  // timer:startStatSelection - Start round timer with timeout callback
  const store = machine?.context?.store;
  if (store) {
    stateLogger.info("Starting stat selection timer", {
      store: {
        selectionMade: store.selectionMade,
        roundsPlayed: store.roundsPlayed
      }
    });

    await startTimer(async (stat, opts) => {
      // Debug logging for auto-selection
      stateLogger.debug("Auto-selecting stat due to timeout", { stat, opts });

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

  // Debug logging for state handler exit
  logStateHandlerExit("waitingForPlayerAction", {
    timerStarted: !!store,
    buttonsEnabled: true
  });
}

export default waitingForPlayerActionEnter;
