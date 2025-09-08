import { showSnackbar } from "../showSnackbar.js";
import { t } from "../i18n.js";
import * as battleEvents from "./battleEvents.js";
import { isTestModeEnabled } from "../testModeUtils.js";
import { safeCall } from "./safeCall.js";

let opponentDelayMs = 500;

/** Set opponent reveal delay. @pseudocode Store finite ms in `opponentDelayMs`. */
export function setOpponentDelay(ms) {
  if (Number.isFinite(ms)) opponentDelayMs = ms;
}

/** Get opponent reveal delay. @pseudocode Return `opponentDelayMs`. */
export function getOpponentDelay() {
  return opponentDelayMs;
}

/**
 * Show stat selection prompt.
 * @pseudocode Clear `#round-message`, show localized snackbar, emit `roundPrompt`, warn in test mode.
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
