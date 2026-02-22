import { emitBattleEvent } from "../battleEvents.js";
import { logSelectionMutation, shouldClearSelectionForNextRound } from "../selectionHandler.js";
import {
  logStateHandlerEnter,
  logStateHandlerExit,
  createComponentLogger
} from "../debugLogger.js";
import { resetSelectionFinalized } from "../selectionState.js";

const stateLogger = createComponentLogger("RoundSelect");
const SELECTION_IN_FLIGHT_GUARD = Symbol.for("classicBattle.selectionInFlight");

/**
 * onEnter handler for `roundSelect` state.
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
export async function roundSelectEnter(machine) {
  stateLogger.debug("roundSelectEnter invoked", {
    currentState: machine?.currentState
  });

  // Trace selection flags when the state machine enters this state
  const store = machine?.context?.store;

  if (store) {
    try {
      const selectionInFlight = !!store?.[SELECTION_IN_FLIGHT_GUARD];
      if (!selectionInFlight) {
        const shouldClear = shouldClearSelectionForNextRound(store);
        if (shouldClear) {
          // Use unified API to reset selection state
          resetSelectionFinalized(store);
          store.selectionMade = false;
          store.__lastSelectionMade = false;
          store.playerChoice = null;
          logSelectionMutation("roundSelectEnter.reset", store);
        } else {
          logSelectionMutation("roundSelectEnter.resetDeferred", store, {
            roundsPlayed: store.roundsPlayed,
            lastSelectionRound: store.__lastSelectionRound
          });
        }
      } else {
        logSelectionMutation("roundSelectEnter.resetSkipped", store, {
          selectionInFlight: true
        });
      }
    } catch (err) {
      stateLogger.warn("Failed to reset selection flags on entry", {
        error: err?.message
      });
    }
  }

  logSelectionMutation("roundSelectEnter.enter", store, {
    machineState: machine?.currentState ?? null
  });

  // Debug logging for state handler entry
  logStateHandlerEnter("roundSelect", machine?.currentState, {
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

  // Turn-based flow: no stat-selection timer is started. The player picks
  // a stat whenever they are ready; the game waits indefinitely.

  // Debug logging for state handler exit
  logStateHandlerExit("roundSelect", {
    timerStarted: false,
    buttonsEnabled: true
  });
}

export default roundSelectEnter;
