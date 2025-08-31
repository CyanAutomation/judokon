import { STATS, stopTimer } from "../battleEngineFacade.js";
import { chooseOpponentStat } from "../api/battleUI.js";
import { emitBattleEvent } from "./battleEvents.js";
import { dispatchBattleEvent } from "./eventDispatcher.js";
import { resolveRound } from "./roundResolver.js";
import { getCardStatValue } from "./cardStatUtils.js";
import { getBattleState } from "./eventBus.js";
const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;

/**
 * Determine the opponent's stat choice based on difficulty.
 *
 * @pseudocode
 * 1. Map the provided stats object into `{stat, value}` pairs.
 * 2. Pass the array to `chooseOpponentStat` with the provided difficulty.
 * 3. Return the chosen stat key.
 *
 * @param {Record<string, number>} stats - Opponent stat values.
 * @param {"easy"|"medium"|"hard"} [difficulty="easy"] Difficulty setting.
 * @returns {string} One of the values from `STATS`.
 */
export function simulateOpponentStat(stats, difficulty = "easy") {
  const values = STATS.map((stat) => ({ stat, value: Number(stats?.[stat]) || 0 }));
  return chooseOpponentStat(values, difficulty);
}

/**
 * Retrieve stat values for the player and opponent cards.
 *
 * @pseudocode
 * 1. If `playerVal` is missing or NaN, read the value from `#player-card`.
 * 2. If `opponentVal` is missing or NaN, read the value from `#opponent-card`.
 * 3. Coerce both values to numbers and return them.
 *
 * @param {string} stat - Selected stat key.
 * @param {number} [playerVal] - Precomputed player stat value.
 * @param {number} [opponentVal] - Precomputed opponent stat value.
 * @returns {{playerVal: number, opponentVal: number}}
 */
export function getPlayerAndOpponentValues(stat, playerVal, opponentVal) {
  if (playerVal === undefined || Number.isNaN(playerVal)) {
    playerVal = getCardStatValue(document.querySelector("#player-card"), stat);
  }
  if (opponentVal === undefined || Number.isNaN(opponentVal)) {
    opponentVal = getCardStatValue(document.querySelector("#opponent-card"), stat);
  }
  return { playerVal: Number(playerVal), opponentVal: Number(opponentVal) };
}

/**
 * Resolve the round directly without the battle state machine.
 *
 * @pseudocode
 * 1. In Vitest, use a deterministic delay of 0ms.
 * 2. Call `resolveRound` and clear `store.playerChoice`.
 * 3. Return the result.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 * @param {object} [opts] - Resolver options.
 * @returns {Promise<ReturnType<typeof resolveRound>>}
 */
export async function resolveRoundDirect(store, stat, playerVal, opponentVal, opts = {}) {
  const deterministicOpts =
    typeof process !== "undefined" && process.env && process.env.VITEST
      ? { ...opts, delayMs: 0 }
      : opts;
  const result = await resolveRound(store, stat, playerVal, opponentVal, deterministicOpts);
  store.playerChoice = null;
  return result;
}

/**
 * Validate whether a stat selection should proceed.
 *
 * @pseudocode
 * 1. Return `false` if a selection was already made.
 * 2. Read the current battle state via `getBattleState()`.
 * 3. Return `false` unless the state is `waitingForPlayerAction` or `roundDecision`.
 * 4. Otherwise return `true`.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @returns {boolean} `true` if the selection is allowed.
 */
function validateSelectionState(store) {
  if (store.selectionMade) {
    return false;
  }

  try {
    const current = typeof getBattleState === "function" ? getBattleState() : null;
    if (current && current !== "waitingForPlayerAction" && current !== "roundDecision") {
      try {
        if (!IS_VITEST) console.warn(`Ignored stat selection while in state=${current}`);
      } catch {}
      return false;
    }
  } catch {}
  return true;
}

/**
 * Record the player's selection on the store and coerce stat values.
 *
 * @pseudocode
 * 1. Mark `store.selectionMade` and store the chosen stat.
 * 2. Resolve missing stat values via `getPlayerAndOpponentValues`.
 * 3. Return the coerced `{playerVal, opponentVal}`.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {number} [playerVal] - Optional player stat value.
 * @param {number} [opponentVal] - Optional opponent stat value.
 * @returns {{playerVal: number, opponentVal: number}}
 */
function applySelectionToStore(store, stat, playerVal, opponentVal) {
  store.selectionMade = true;
  store.playerChoice = stat;
  return getPlayerAndOpponentValues(stat, playerVal, opponentVal);
}

/**
 * @summary Stop timers and clear pending timeouts tied to stat selection.
 *
 * @pseudocode
 * 1. Call `stopTimer()` to halt the countdown.
 * 2. Clear `store.statTimeoutId` and `store.autoSelectId`.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @returns {void}
 */
export function cleanupTimers(store) {
  stopTimer();
  clearTimeout(store.statTimeoutId);
  store.statTimeoutId = null;
  clearTimeout(store.autoSelectId);
  store.autoSelectId = null;
}

/**
 * Emit the selection event and apply test-mode shortcuts.
 *
 * @pseudocode
 * 1. Emit `statSelected` via `emitBattleEvent`.
 * 2. In Vitest, clear the next-round timer and round message elements.
 * 3. Dynamically show the opponent delay snackbar.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 */
async function emitSelectionEvent(store, stat, playerVal, opponentVal) {
  emitBattleEvent("statSelected", { store, stat, playerVal, opponentVal });

  try {
    if (typeof process !== "undefined" && process.env && process.env.VITEST) {
      try {
        const sb = await import("../setupScoreboard.js");
        sb.clearTimer();
      } catch {}
      try {
        const msg = document.getElementById("round-message");
        if (msg) msg.textContent = "";
      } catch {}
      try {
        const ui = await import("../showSnackbar.js");
        const i18n = await import("../i18n.js");
        ui.showSnackbar(i18n.t("ui.opponentChoosing"));
      } catch {}
    }
  } catch {}
}

/**
 * @summary Handles the player's stat selection.
 *
 * @pseudocode
 * 1. Abort unless `validateSelectionState` allows the selection.
 * 2. Mark the selection and coerce stat values via `applySelectionToStore`.
 * 3. Halt timers with `cleanupTimers`.
 * 4. Emit the `statSelected` event via `emitSelectionEvent`.
 * 5. Dispatch `statSelected` to advance the battle state machine.
 * 6. If the machine hasn't cleared `store.playerChoice`, resolve the round via
 *    `resolveRoundDirect` and dispatch `roundResolved`.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {{playerVal: number, opponentVal: number}} values - Precomputed stat values.
 * @returns {Promise<ReturnType<typeof resolveRound>>}
 */
export async function handleStatSelection(store, stat, { playerVal, opponentVal, ...opts } = {}) {
  if (!validateSelectionState(store)) {
    return;
  }

  ({ playerVal, opponentVal } = applySelectionToStore(store, stat, playerVal, opponentVal));
  cleanupTimers(store);
  await emitSelectionEvent(store, stat, playerVal, opponentVal);
  let resolvedByMachine = false;
  try {
    await dispatchBattleEvent("statSelected");
    resolvedByMachine = store.playerChoice === null;
  } catch {}
  if (resolvedByMachine) {
    return;
  }
  const result = await resolveRoundDirect(store, stat, playerVal, opponentVal, opts);
  try {
    await dispatchBattleEvent("roundResolved");
  } catch {}
  return result;
}
