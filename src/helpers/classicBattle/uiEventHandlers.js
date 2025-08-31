import { onBattleEvent, getBattleEventTarget } from "./battleEvents.js";
import { getOpponentCardData } from "./opponentController.js";
import * as scoreboard from "../setupScoreboard.js";
import { showSnackbar } from "../showSnackbar.js";
import { t } from "../i18n.js";
import {
  renderOpponentCard,
  showRoundOutcome,
  showStatComparison,
  updateDebugPanel
} from "./uiHelpers.js";

let opponentSnackbarId = 0;
let opponentDelayMs = 500;

export function bindUIHelperEventHandlersDynamic() {
  // Ensure we only bind once per EventTarget instance
  try {
    const KEY = "__cbUIHelpersDynamicBoundTargets";
    const target = getBattleEventTarget();
    const set = (globalThis[KEY] ||= new WeakSet());
    if (set.has(target)) return;
    set.add(target);
  } catch {}
  onBattleEvent("opponentReveal", async () => {
    const container = document.getElementById("opponent-card");
    try {
      const j = await getOpponentCardData();
      if (j) await renderOpponentCard(j, container);
    } catch {}
  });

  onBattleEvent("statSelected", async (e) => {
    try {
      scoreboard.clearTimer?.();
    } catch {}
    try {
      const opts = (e && e.detail && e.detail.opts) || {};
      if (!opts.delayOpponentMessage) {
        opponentSnackbarId = setTimeout(
          () => showSnackbar(t("ui.opponentChoosing")),
          opponentDelayMs
        );
      }
    } catch {}
  });

  onBattleEvent("roundResolved", async (e) => {
    clearTimeout(opponentSnackbarId);
    const { store, stat, playerVal, opponentVal, result } = e.detail || {};
    if (!result) return;
    try {
      showRoundOutcome(result.message || "");
      showStatComparison(store, stat, playerVal, opponentVal);
      updateDebugPanel();
    } catch {}
  });
}
