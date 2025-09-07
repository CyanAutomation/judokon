import { onBattleEvent, getBattleEventTarget } from "./battleEvents.js";
import { getOpponentCardData } from "./opponentController.js";
import * as scoreboard from "../setupScoreboard.js";
import { showSnackbar } from "../showSnackbar.js";
import { t } from "../i18n.js";
import { renderOpponentCard, showRoundOutcome, showStatComparison } from "./uiHelpers.js";
import { updateDebugPanel } from "./debugPanel.js";
import { getOpponentDelay } from "./snackbar.js";

let opponentSnackbarId = 0;

export function bindUIHelperEventHandlersDynamic() {
  /**
   * Bind dynamic UI helper event handlers on the shared battle EventTarget.
   *
   * This function idempotently attaches listeners for opponent reveals,
   * stat selection, and round resolved events. Handlers are attached to the
   * current `getBattleEventTarget()` instance and guarded so multiple calls
   * against the same target are a no-op.
   *
   * @pseudocode
   * 1. Compute a WeakSet attached to global to track bound EventTargets.
   * 2. If the current target is already bound, return early.
   * 3. Attach handlers for `opponentReveal`, `statSelected`, and `roundResolved`.
   * 4. Each handler renders UI and updates debug panel or shows snackbars.
   *
   * @returns {void}
   */
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
          getOpponentDelay()
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
