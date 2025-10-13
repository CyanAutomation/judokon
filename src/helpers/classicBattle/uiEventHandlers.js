import { onBattleEvent, getBattleEventTarget } from "./battleEvents.js";
import { getOpponentCardData } from "./opponentController.js";
import * as scoreboard from "../setupScoreboard.js";
import { showSnackbar } from "../showSnackbar.js";
import { t } from "../i18n.js";
import { renderOpponentCard, showRoundOutcome, showStatComparison } from "./uiHelpers.js";
import { updateDebugPanel } from "./debugPanel.js";
import { getOpponentDelay } from "./snackbar.js";
import { markOpponentPromptNow } from "./opponentPromptTracker.js";
import { isEnabled } from "../featureFlags.js";

let opponentSnackbarId = 0;

function clearOpponentSnackbarTimeout() {
  if (opponentSnackbarId) {
    clearTimeout(opponentSnackbarId);
  }
  opponentSnackbarId = 0;
}

function clearFallbackPromptTimer() {
  if (typeof window === "undefined") return;
  try {
    const id = window.__battleClassicOpponentPromptFallback;
    if (id) clearTimeout(id);
  } catch {}
  try {
    window.__battleClassicOpponentPromptFallback = 0;
  } catch {}
}

function displayOpponentChoosingPrompt() {
  try {
    showSnackbar(t("ui.opponentChoosing"));
  } catch {
    // Intentionally ignore snackbar failures so battle flow is never interrupted.
  }
  try {
    markOpponentPromptNow();
  } catch {
    // Marking failures are non-critical; keep the UX resilient to prompt tracker issues.
  }
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
      // Reveal the opponent card by removing the hidden class
      if (container) container.classList.remove("opponent-hidden");
      // Clear the mystery card placeholder
      if (container) container.innerHTML = "";
      const j = await getOpponentCardData();
      if (j) await renderOpponentCard(j, container);
    } catch {}
  });

  onBattleEvent("statSelected", async (e) => {
    try {
      scoreboard.clearTimer?.();
    } catch {}
    try {
      const detail = (e && e.detail) || {};
      const hasOpts = Object.prototype.hasOwnProperty.call(detail, "opts");
      const opts = hasOpts ? detail.opts || {} : {};
      const flagEnabled = isEnabled("opponentDelayMessage");
      const shouldDelay = flagEnabled && opts.delayOpponentMessage !== false;

      clearOpponentSnackbarTimeout();
      clearFallbackPromptTimer();

      if (!shouldDelay) {
        displayOpponentChoosingPrompt();
        return;
      }

      const delaySource = Object.prototype.hasOwnProperty.call(opts, "delayMs")
        ? Number(opts.delayMs)
        : Number(getOpponentDelay());
      const resolvedDelay = Number.isFinite(delaySource) && delaySource > 0 ? delaySource : 0;

      if (resolvedDelay <= 0) {
        displayOpponentChoosingPrompt();
        return;
      }

      opponentSnackbarId = setTimeout(() => {
        displayOpponentChoosingPrompt();
      }, resolvedDelay);
    } catch {}
  });

  onBattleEvent("roundResolved", async (e) => {
    clearOpponentSnackbarTimeout();
    const { store, stat, playerVal, opponentVal, result } = e.detail || {};
    if (!result) return;
    try {
      const numericPlayer = Number(playerVal);
      const numericOpponent = Number(opponentVal);
      if (
        store &&
        typeof store === "object" &&
        typeof stat === "string" &&
        Number.isFinite(numericPlayer) &&
        Number.isFinite(numericOpponent)
      ) {
        showStatComparison(store, stat, numericPlayer, numericOpponent);
      }
    } catch {}
    try {
      showRoundOutcome(result.message || "", stat, playerVal, opponentVal);
      updateDebugPanel();
    } catch {}
  });
}
