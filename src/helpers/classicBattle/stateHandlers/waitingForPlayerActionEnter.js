import { emitBattleEvent } from "../battleEvents.js";
import { startTimer } from "../timerService.js";
import { handleStatSelection, logSelectionMutation } from "../selectionHandler.js";
import { getCardStatValue } from "../cardStatUtils.js";
import { getOpponentJudoka } from "../cardSelection.js";
import {
  logStateHandlerEnter,
  logStateHandlerExit,
  createComponentLogger
} from "../debugLogger.js";

const stateLogger = createComponentLogger("WaitingForPlayerAction");

function queryCardByRole(role) {
  if (typeof document === "undefined") return null;
  return document.querySelector(`[data-role='${role}']`);
}

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
  stateLogger.debug("waitingForPlayerActionEnter invoked", {
    currentState: machine?.currentState
  });

  // Trace selection flags when the state machine enters this state
  const store = machine?.context?.store;

  if (store) {
    try {
      store.selectionMade = false;
      store.__lastSelectionMade = false;
      store.playerChoice = null;
      logSelectionMutation("waitingForPlayerActionEnter.reset", store);
    } catch (err) {
      stateLogger.warn("Failed to reset selection flags on entry", {
        error: err?.message
      });
    }
  }

  logSelectionMutation("waitingForPlayerActionEnter.enter", store, {
    machineState: machine?.currentState ?? null
  });

  // Also reset the finalization flag
  try {
    if (typeof window !== "undefined") {
      window.__classicBattleSelectionFinalized = false;
      window.__classicBattleLastFinalizeContext = null;
    }
  } catch {
    // Intentionally ignore window global availability errors
  }

  // DEBUG: Clear the selectionInProgress flag when entering this state
  // This ensures buttons can be re-enabled for the new round
  try {
    const container =
      typeof document !== "undefined" ? document.getElementById("stat-buttons") : null;
    if (container && typeof container.dataset !== "undefined") {
      container.dataset.selectionInProgress = "false";
      if (typeof window !== "undefined" && window.console && window.console.debug) {
        window.console.debug(
          "[waitingForPlayerActionEnter] Cleared selectionInProgress flag to false"
        );
      }
    }
  } catch {
    // Intentionally ignore errors
  }

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
  // Now that we've entered the new waiting state, allow buttons to be enabled
  const container =
    typeof document !== "undefined" ? document.getElementById("stat-buttons") : null;
  const selectionInProgress = container?.dataset?.selectionInProgress;
  if (selectionInProgress !== "true") {
    emitBattleEvent("statButtons:enable");
  }

  // timer:startStatSelection - Start round timer with timeout callback
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
      const playerCard = queryCardByRole("player-card");
      const opponentCard = queryCardByRole("opponent-card");

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
