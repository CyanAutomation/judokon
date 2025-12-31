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
      console.error(`[DIAGNOSTIC] BEFORE reset: selectionMade = ${store.selectionMade}`);
      store.selectionMade = false;
      store.__lastSelectionMade = false;
      store.playerChoice = null;
      console.error(`[DIAGNOSTIC] AFTER reset: selectionMade = ${store.selectionMade}`);
      console.error(`[DIAGNOSTIC] Store object ID: ${store.__storeId || "no-id"}`);
      logSelectionMutation("waitingForPlayerActionEnter.reset", store);
    } catch (err) {
      stateLogger.warn("Failed to reset selection flags on entry", {
        error: err?.message
      });
    }
  } else {
    console.error("[DIAGNOSTIC] No store available to reset selection flags");
  }

  logSelectionMutation("waitingForPlayerActionEnter.enter", store, {
    machineState: machine?.currentState ?? null
  });

  // Also reset the finalization flag
  try {
    if (typeof window !== "undefined") {
      window.__classicBattleSelectionFinalized = false;
      window.__classicBattleLastFinalizeContext = null;
      window.__waitingForPlayerActionEnterCalled =
        (window.__waitingForPlayerActionEnterCalled || 0) + 1;
      window.__lastSelectionResetAt = Date.now();
    }
  } catch {
    // Intentionally ignore window global availability errors
  }

  // Debug logging for state handler entry
  logStateHandlerEnter("waitingForPlayerAction", machine?.currentState, {
    hasStore: !!machine?.context?.store,
    storeState: machine?.context?.store
      ? {
          selectionMade: machine.context.store.selectionMade,
          roundReadyForInput: machine.context.store.roundReadyForInput,
          roundsPlayed: machine.context.store.roundsPlayed
        }
      : null
  });

  // prompt:chooseStat - Enable stat buttons
  // Now that we've entered the new waiting state, allow buttons to be enabled
  // Set roundReadyForInput=true if not already set (may not be set yet if roundStarted event handler is still pending)
  if (store && typeof store === "object" && store.roundReadyForInput !== true) {
    store.roundReadyForInput = true;
  }

  const container =
    typeof document !== "undefined" ? document.getElementById("stat-buttons") : null;

  // Ensure selectionInProgress is cleared when entering this state
  if (container && typeof container.dataset !== "undefined") {
    container.dataset.selectionInProgress = "false";
  }

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
