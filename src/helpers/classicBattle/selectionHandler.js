import { STATS, stopTimer } from "../battleEngineFacade.js";
import { chooseOpponentStat } from "../api/battleUI.js";
import { emitBattleEvent } from "./battleEvents.js";
import { dispatchBattleEvent } from "./eventDispatcher.js";
import { resolveRound } from "./roundResolver.js";
import { getCardStatValue } from "./cardStatUtils.js";

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
 * Resolve the round via the battle state machine, falling back to direct
 * resolution on error.
 *
 * @pseudocode
 * 1. Schedule a fallback call to `resolveRound` after 600ms that clears
 *    `playerChoice` once finished.
 * 2. Await `dispatchBattleEvent("statSelected")`.
 * 3. If dispatch fails, call `resolveRound` immediately with deterministic
 *    options in Vitest environments.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 * @param {object} [opts] - Resolver options.
 * @returns {Promise<ReturnType<typeof resolveRound>|undefined>}
 */
export async function resolveRoundViaMachine(store, stat, playerVal, opponentVal, opts = {}) {
  try {
    setTimeout(() => {
      if (store.playerChoice) {
        resolveRound(store, stat, playerVal, opponentVal, opts)
          .catch(() => {})
          .finally(() => {
            store.playerChoice = null;
          });
      }
    }, 600);
    await dispatchBattleEvent("statSelected");
    return undefined;
  } catch {
    const deterministicOpts =
      typeof process !== "undefined" && process.env && process.env.VITEST
        ? { ...opts, delayMs: 0 }
        : opts;
    return resolveRound(store, stat, playerVal, opponentVal, deterministicOpts);
  }
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
 * Handles the player's stat selection.
 *
 * @pseudocode
 * 1. Ignore if a selection was already made.
 * 2. Record the chosen stat.
 * 3. If values are missing, read them from the player and opponent cards.
 * 4. Coerce the stat values to numbers.
 * 5. Stop running timers and clear pending timeouts on the store.
 * 6. Emit a `statSelected` event with the provided values.
 * 7. Resolve the round either via the state machine or directly, letting the
 *    resolver clear `playerChoice` when finished.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {{playerVal: number, opponentVal: number}} values - Precomputed stat values.
 */
export async function handleStatSelection(store, stat, { playerVal, opponentVal, ...opts } = {}) {
  if (store.selectionMade) {
    return;
  }
  store.selectionMade = true;
  store.playerChoice = stat;
  const values = getPlayerAndOpponentValues(stat, playerVal, opponentVal);
  playerVal = values.playerVal;
  opponentVal = values.opponentVal;
  stopTimer();
  clearTimeout(store.statTimeoutId);
  clearTimeout(store.autoSelectId);
  emitBattleEvent("statSelected", { store, stat, playerVal, opponentVal });
  const hasMachine = typeof document !== "undefined" && !!document.body?.dataset.battleState;
  const resolver = hasMachine ? resolveRoundViaMachine : resolveRoundDirect;
  return resolver(store, stat, playerVal, opponentVal, opts);
}
