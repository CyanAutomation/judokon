import { drawCards, _resetForTest as resetSelection } from "./cardSelection.js";
import { _resetForTest as resetEngineForTest } from "../battleEngineFacade.js";
import * as battleEngine from "../battleEngineFacade.js";
import { cancel as cancelFrame, stop as stopScheduler } from "../../utils/scheduler.js";
import { resetSkipState } from "./skipHandler.js";

/**
 * Create a new battle state store.
 *
 * @pseudocode
 * 1. Initialize battle state values.
 * 2. Return the store.
 *
 * @returns {{quitModal: ReturnType<import("../../components/Modal.js").createModal>|null, statTimeoutId: ReturnType<typeof setTimeout>|null, autoSelectId: ReturnType<typeof setTimeout>|null, compareRaf: number, selectionMade: boolean}}
 */
export function createBattleStore() {
  return {
    quitModal: null,
    statTimeoutId: null,
    autoSelectId: null,
    compareRaf: 0,
    selectionMade: false
  };
}

function getStartRound(store) {
  if (typeof window !== "undefined" && window.startRoundOverride) {
    return window.startRoundOverride;
  }
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
 * 1. Reset selection flags on the store.
 * 2. Draw player and opponent cards.
 * 3. Compute the current round number via `battleEngine.getRoundsPlayed() + 1`.
 * 4. Return the drawn cards and round number.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 */
export async function startRound(store) {
  store.selectionMade = false;
  const cards = await drawCards();
  const roundNumber = battleEngine.getRoundsPlayed() + 1;
  return { ...cards, roundNumber };
}

/**
 * Reset internal state for tests.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 */
export function _resetForTest(store) {
  resetSkipState();
  resetSelection();
  battleEngine._resetForTest();
  stopScheduler();
  if (typeof window !== "undefined") {
    delete window.startRoundOverride;
  }
  clearTimeout(store.statTimeoutId);
  clearTimeout(store.autoSelectId);
  store.statTimeoutId = null;
  store.autoSelectId = null;
  store.selectionMade = false;
  cancelFrame(store.compareRaf);
  store.compareRaf = 0;
  window.dispatchEvent(new CustomEvent("game:reset-ui", { detail: { store } }));
}
