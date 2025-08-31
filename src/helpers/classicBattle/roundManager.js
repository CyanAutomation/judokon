import { drawCards, _resetForTest as resetSelection } from "./cardSelection.js";
import { _resetForTest as resetEngineForTest } from "../battleEngineFacade.js";
import * as battleEngine from "../battleEngineFacade.js";
import { cancel as cancelFrame, stop as stopScheduler } from "../../utils/scheduler.js";
import { resetSkipState } from "./skipHandler.js";
import { emitBattleEvent } from "./battleEvents.js";
import { readDebugState } from "./debugHooks.js";

/**
 * Create a new battle state store.
 *
 * @pseudocode
 * 1. Initialize battle state values.
 * 2. Return the store.
 *
 * @returns {{quitModal: ReturnType<import("../../components/Modal.js").createModal>|null, statTimeoutId: ReturnType<typeof setTimeout>|null, autoSelectId: ReturnType<typeof setTimeout>|null, compareRaf: number, selectionMade: boolean, stallTimeoutMs: number, playerChoice: string|null}}
 */
export function createBattleStore() {
  return {
    quitModal: null,
    statTimeoutId: null,
    autoSelectId: null,
    compareRaf: 0,
    selectionMade: false,
    stallTimeoutMs: 35000,
    playerChoice: null
  };
}

function getStartRound(store) {
  const api = readDebugState("classicBattleDebugAPI");
  if (api?.startRoundOverride) return api.startRoundOverride;
  return () => startRound(store);
}

/**
 * Reset match state and start a new game.
 *
 * @pseudocode
 * 1. Reset engine scores and flags.
 * 2. Close any open modals and clear the scoreboard message.
 * 3. Call the start round function to begin a new match.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export async function handleReplay(store) {
  resetEngineForTest();
  window.dispatchEvent(new CustomEvent("game:reset-ui", { detail: { store } }));
  const startRoundFn = getStartRound(store);
  return startRoundFn();
}

/**
 * Start a new round by drawing cards and starting timers.
 *
 * @pseudocode
 * 1. Reset selection flags on the store and clear any previous player choice.
 * 2. Draw player and opponent cards.
 * 3. Compute the current round number via `battleEngine.getRoundsPlayed() + 1`.
 * 4. If provided, invoke `onRoundStart` with the store and round number.
 * 5. Dispatch a `roundStarted` event with the store and round number.
 * 6. Return the drawn cards and round number.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {(store: ReturnType<typeof createBattleStore>, roundNumber: number) => void} [onRoundStart]
 *        Optional callback to apply UI updates immediately.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export async function startRound(store, onRoundStart) {
  store.selectionMade = false;
  store.playerChoice = null;
  const cards = await drawCards();
  const roundNumber = battleEngine.getRoundsPlayed() + 1;
  if (typeof onRoundStart === "function") {
    try {
      onRoundStart(store, roundNumber);
    } catch {}
  }
  emitBattleEvent("roundStarted", { store, roundNumber });
  return { ...cards, roundNumber };
}

/**
 * Reset internal state for tests.
 *
 * Clears timers, selection flags, and any previous player choice.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function _resetForTest(store) {
  resetSkipState();
  resetSelection();
  battleEngine._resetForTest();
  stopScheduler();
  if (typeof window !== "undefined") {
    const api = readDebugState("classicBattleDebugAPI");
    if (api) delete api.startRoundOverride;
    else delete window.startRoundOverride;
  }
  if (store && typeof store === "object") {
    try {
      clearTimeout(store.statTimeoutId);
      clearTimeout(store.autoSelectId);
    } catch {}
    store.statTimeoutId = null;
    store.autoSelectId = null;
    store.selectionMade = false;
    // Reset any prior player stat selection
    store.playerChoice = null;
    try {
      cancelFrame(store.compareRaf);
    } catch {}
    store.compareRaf = 0;
    try {
      window.dispatchEvent(new CustomEvent("game:reset-ui", { detail: { store } }));
    } catch {}
  } else {
    // Best-effort notify UI without a concrete store instance
    try {
      window.dispatchEvent(new CustomEvent("game:reset-ui", { detail: { store: null } }));
    } catch {}
  }
}

/**
 * Reset the Classic Battle match state and UI.
 *
 * Alias of `_resetForTest` for production use. Clears timers, engine state,
 * store timeouts, and emits a `game:reset-ui` event to allow the UI to
 * teardown/reinitialize. Used by the classic battle orchestrator when
 * entering the lobby (`waitingForMatchStart`).
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export const resetGame = _resetForTest;
