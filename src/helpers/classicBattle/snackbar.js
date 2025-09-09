import { showSnackbar } from "../showSnackbar.js";
import { t } from "../i18n.js";
import * as battleEvents from "./battleEvents.js";
import { isTestModeEnabled } from "../testModeUtils.js";
import { safeCall } from "./safeCall.js";

let opponentDelayMs = 500;

/**
 * Set the delay used before revealing the opponent's choice.
 *
 * @pseudocode
 * 1. Validate that `ms` is a finite number.
 * 2. If valid, store the value on module-scoped `opponentDelayMs`.
 * 3. If invalid, leave the existing value unchanged.
 *
 * @param {number} ms - Milliseconds to wait before revealing opponent choice.
 * @returns {void}
 */
export function setOpponentDelay(ms) {
  if (Number.isFinite(ms)) opponentDelayMs = ms;
}

/**
 * Get the configured opponent reveal delay in milliseconds.
 *
 * @pseudocode
 * 1. Return the module-scoped `opponentDelayMs` value.
 *
 * @returns {number} Milliseconds delay for opponent reveal.
 */
export function getOpponentDelay() {
  return opponentDelayMs;
}

/**
 * Show the player prompt to choose a stat.
 *
 * @pseudocode
 * 1. Clear any existing round message by emptying `#round-message` text.
 * 2. Display a localized snackbar using `showSnackbar(t('ui.selectMove'))`.
 * 3. Emit a `roundPrompt` battle event to notify listeners.
 * 4. If test mode is enabled, log a test-only warning to help assertions.
 *
 * @returns {void}
 */
export function showSelectionPrompt() {
  const el = document.getElementById("round-message");
  if (el) el.textContent = "";
  showSnackbar(t("ui.selectMove"));
  safeCall(() => battleEvents.emitBattleEvent("roundPrompt"));
  safeCall(() => {
    if (isTestModeEnabled()) console.warn("[test] roundPrompt emitted");
  });
}
