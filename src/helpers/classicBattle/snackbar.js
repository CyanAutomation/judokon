import { showSnackbar } from "../showSnackbar.js";
import { t } from "../i18n.js";
import * as battleEvents from "./battleEvents.js";
import { isTestModeEnabled } from "../testModeUtils.js";
import { safeCall } from "./safeCall.js";

let opponentDelayMs = 500;

export function setOpponentDelay(ms) {
  if (Number.isFinite(ms)) opponentDelayMs = ms;
}

export function getOpponentDelay() {
  return opponentDelayMs;
}

export function showSelectionPrompt() {
  const el = document.getElementById("round-message");
  if (el) el.textContent = "";
  showSnackbar(t("ui.selectMove"));
  safeCall(() => battleEvents.emitBattleEvent("roundPrompt"));
  safeCall(() => {
    if (isTestModeEnabled()) console.warn("[test] roundPrompt emitted");
  });
}
