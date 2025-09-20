import { onBattleEvent, getBattleEventTarget } from "./battleEvents.js";
import { getOpponentCardData } from "./opponentController.js";
import * as scoreboard from "../setupScoreboard.js";
import { showSnackbar } from "../showSnackbar.js";
import { t } from "../i18n.js";
import { renderOpponentCard, showRoundOutcome, showStatComparison } from "./uiHelpers.js";
import { updateDebugPanel } from "./debugPanel.js";
import { getOpponentDelay } from "./snackbar.js";

let opponentSnackbarId = 0;

function clearOpponentSnackbarTimeout() {
  if (opponentSnackbarId) {
    clearTimeout(opponentSnackbarId);
  }
  opponentSnackbarId = 0;
}

/**
 * Bind dynamic UI helper event handlers on the shared battle EventTarget.
 *
 * @pseudocode
 * 1. Track EventTargets in a WeakSet to avoid duplicate bindings.
 * 2. Attach listeners for opponent reveal, stat selection, and round resolution.
 * 3. Render opponent card, show snackbar messages, and update debug panel.
 *
 * @returns {void}
 */
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
      // If the caller requests a delayed opponent message, schedule it
      // after the configured opponent delay. Otherwise show it immediately.
      if (opts.delayOpponentMessage) {
        const delay = Number(getOpponentDelay());
        if (!Number.isFinite(delay) || delay <= 0) {
          clearOpponentSnackbarTimeout();
          try {
            showSnackbar(t("ui.opponentChoosing"));
          } catch {}
        } else {
          clearOpponentSnackbarTimeout();
          opponentSnackbarId = setTimeout(() => {
            try {
              showSnackbar(t("ui.opponentChoosing"));
            } catch {}
          }, delay);
        }
      } else {
        clearOpponentSnackbarTimeout();
        // Cancel any pending delay to ensure the immediate snackbar wins.
        try {
          showSnackbar(t("ui.opponentChoosing"));
        } catch {}
      }
    } catch {}
  });

  onBattleEvent("roundResolved", async (e) => {
    clearOpponentSnackbarTimeout();
    const { store, stat, playerVal, opponentVal, result } = e.detail || {};
    if (!result) return;
    try {
      showRoundOutcome(result.message || "");
      showStatComparison(store, stat, playerVal, opponentVal);
      updateDebugPanel();
    } catch {}
  });
}
