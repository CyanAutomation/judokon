const shouldShowTestLogs = () => typeof process !== "undefined" && process.env?.SHOW_TEST_LOGS;
const isConsoleMocked = (method) => {
  const viInstance = globalThis?.vi;
  return (
    typeof viInstance?.isMockFunction === "function" &&
    typeof method === "function" &&
    viInstance.isMockFunction(method)
  );
};
const debugLog = (...args) => {
  if (typeof console === "undefined") return;
  if (shouldShowTestLogs() || isConsoleMocked(console.log)) {
    console.log(...args);
  }
};

debugLog("[TEST DEBUG] waitForState.js top-level loaded");
// [TEST DEBUG] top-level waitForState.js

debugLog("[TEST DEBUG] top-level waitForState.js");
import { onBattleEvent, offBattleEvent } from "../src/helpers/classicBattle/battleEvents.js";
import { getStateSnapshot } from "../src/helpers/classicBattle/battleDebug.js";

/**
 * Wait for the classic battle state machine to reach a specific state.
 *
 * @pseudocode
 * if current state matches target, resolve
 * register listener for battleStateChange
 * on match, remove listener and resolve
 * on timeout, remove listener and reject
 *
 * @param {string} target - Expected state name.
 * @param {number} [timeout=10000] - Time in ms before rejecting.
 * @returns {Promise<void>} Resolves when the state is reached.
 */
export function waitForState(target, timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (getStateSnapshot().state === target) return resolve();
    const handler = (e) => {
      debugLog("[TEST DEBUG] waitForState handler:", e.detail);
      if (e.detail?.to === target) {
        offBattleEvent("battleStateChange", handler);
        resolve();
      }
    };
    onBattleEvent("battleStateChange", handler);
    setTimeout(() => {
      offBattleEvent("battleStateChange", handler);
      reject(new Error(`timeout for ${target}`));
    }, timeout);
  });
}
