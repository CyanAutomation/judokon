import { showSnackbar } from "../showSnackbar.js";
import { t } from "../i18n.js";
import * as battleEvents from "./battleEvents.js";
import { isTestModeEnabled } from "../testModeUtils.js";
import { safeCall } from "./safeCall.js";

let opponentDelayMs = 500;

/**
 * Set the delay used when revealing opponent information.
 *
 * @param {number} ms - Milliseconds to wait before revealing opponent details.
 * @returns {void}
 * @pseudocode
 * 1. When `ms` is a finite number, store it in module-scoped `opponentDelayMs`.
 */
export function setOpponentDelay(ms) {
  if (Number.isFinite(ms)) opponentDelayMs = ms;
}

/**
 * Get the currently configured opponent reveal delay.
 *
 * @returns {number} Milliseconds used for opponent reveal delay.
 * @pseudocode
 * 1. Return the module-scoped `opponentDelayMs` value.
 */
export function getOpponentDelay() {
  return opponentDelayMs;
}

/**
 * Show the player prompt asking them to select a stat.
 *
 * This updates the `#round-message` text, shows a snackbar prompt and
 * emits a `roundPrompt` battle event for listeners (tests and UI).
 *
 * @returns {void}
 * @pseudocode
 * 1. Clear `#round-message` text when present.
 * 2. Call `showSnackbar` with localized "select move" text.
 * 3. Emit `roundPrompt` via the battle events bus.
 * 4. When in test mode, log a test warning for visibility.
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
