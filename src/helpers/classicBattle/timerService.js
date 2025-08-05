import { startTimer, scheduleNextRound } from "./timerControl.js";
import * as infoBar from "../setupBattleInfoBar.js";

/**
 * Handle stat selection stall by prompting user and auto-selecting a random stat.
 *
 * @pseudocode
 * 1. Show a stall message via `infoBar.showMessage`.
 * 2. After 5 seconds choose a random stat using `simulateStat`.
 * 3. Call `handleStatSelection` with the chosen stat.
 *
 * @param {object} store - Timer store to track timeout ids.
 * @param {(store: object, stat: string) => Promise<void>} handleStatSelection - Callback to process the stat.
 * @param {() => string} simulateStat - Function returning a random stat.
 */
export function handleStatSelectionTimeout(store, handleStatSelection, simulateStat) {
  infoBar.showMessage("Stat selection stalled. Pick a stat or wait for auto-pick.");
  store.autoSelectId = setTimeout(() => {
    const randomStat = simulateStat();
    handleStatSelection(store, randomStat);
  }, 5000);
}

/**
 * Start a timeout for stat selection.
 *
 * @pseudocode
 * 1. After 35 seconds call `handleStatSelectionTimeout`.
 * 2. Store the timeout id on `store.statTimeoutId`.
 *
 * @param {object} store
 * @param {(store: object, stat: string) => Promise<void>} handleStatSelection
 * @param {() => string} simulateStat
 */
export function scheduleStatSelectionTimeout(store, handleStatSelection, simulateStat) {
  store.statTimeoutId = setTimeout(
    () => handleStatSelectionTimeout(store, handleStatSelection, simulateStat),
    35000
  );
}

/**
 * Clear any active stat selection timers.
 *
 * @param {object} store
 */
export function clearStatSelectionTimers(store) {
  clearTimeout(store.statTimeoutId);
  clearTimeout(store.autoSelectId);
  store.statTimeoutId = null;
  store.autoSelectId = null;
}

export { startTimer, scheduleNextRound };
