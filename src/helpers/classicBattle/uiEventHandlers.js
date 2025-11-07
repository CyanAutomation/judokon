import { onBattleEvent, getBattleEventTarget } from "./battleEvents.js";
import { getOpponentCardData } from "./opponentController.js";
import * as scoreboard from "../setupScoreboard.js";
import { showSnackbar } from "../showSnackbar.js";
import { t } from "../i18n.js";
import { renderOpponentCard, showRoundOutcome, showStatComparison } from "./uiHelpers.js";
import { updateDebugPanel } from "./debugPanel.js";
import { getOpponentDelay } from "./snackbar.js";
import {
  markOpponentPromptNow,
  recordOpponentPromptTimestamp,
  getOpponentPromptMinDuration
} from "./opponentPromptTracker.js";
import { isEnabled } from "../featureFlags.js";
import {
  applyOpponentCardPlaceholder,
  OPPONENT_CARD_CONTAINER_ARIA_LABEL,
  OPPONENT_PLACEHOLDER_ARIA_LABEL,
  OPPONENT_PLACEHOLDER_ID
} from "./opponentPlaceholder.js";

let opponentSnackbarId = 0;
let pendingOpponentCardData = null;

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

function waitForNextFrame() {
  return new Promise((resolve) => {
    try {
      if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => resolve());
        return;
      }
    } catch {}
    try {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => resolve());
        return;
      }
    } catch {}
    setTimeout(resolve, 0);
  });
}

async function revealOpponentCardAfterResolution() {
  const container = document.getElementById("opponent-card");
  if (!container) {
    pendingOpponentCardData = null;
    return;
  }
  let cardData = pendingOpponentCardData;
  if (!cardData) {
    try {
      cardData = await getOpponentCardData();
    } catch {
      cardData = null;
    }
  }
  if (cardData) {
    try {
      await renderOpponentCard(cardData, container);
    } catch {
      pendingOpponentCardData = null;
      return;
    }
    await waitForNextFrame();
    try {
      const placeholder = container.querySelector(`#${OPPONENT_PLACEHOLDER_ID}`);
      if (placeholder) placeholder.remove();
    } catch {}
    try {
      container.classList.remove("is-obscured");
      container.classList.remove("opponent-hidden");
    } catch {}
    try {
      container.setAttribute("aria-label", OPPONENT_CARD_CONTAINER_ARIA_LABEL);
    } catch {}
  }
  pendingOpponentCardData = null;
}

function displayOpponentChoosingPrompt({ markTimestamp = true, notifyReady = true } = {}) {
  try {
    showSnackbar(t("ui.opponentChoosing"));
  } catch {
    // Intentionally ignore snackbar failures so battle flow is never interrupted.
  }
  let recordedTimestamp;
  if (markTimestamp) {
    try {
      recordedTimestamp = markOpponentPromptNow({ notify: notifyReady });
    } catch {
      // Marking failures are non-critical; keep the UX resilient to prompt tracker issues.
    }
  }
  return recordedTimestamp;
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
    console.log("[bindUIHelperEventHandlersDynamic] Target:", target);
    console.log("[bindUIHelperEventHandlersDynamic] Already bound?", set.has(target));
    if (set.has(target)) {
      console.log("[bindUIHelperEventHandlersDynamic] Skipping bind, already bound");
      return;
    }
    console.log("[bindUIHelperEventHandlersDynamic] Binding handlers");
    set.add(target);
  } catch (e) {
    console.log("[bindUIHelperEventHandlersDynamic] Error in binding setup:", e);
  }
  onBattleEvent("opponentReveal", async () => {
    const container = document.getElementById("opponent-card");
    try {
      pendingOpponentCardData = await getOpponentCardData();
    } catch {
      pendingOpponentCardData = null;
    }
    try {
      if (container && !container.querySelector(`#${OPPONENT_PLACEHOLDER_ID}`)) {
        applyOpponentCardPlaceholder(container);
      }
    } catch {}
    try {
      if (container) {
        container.classList.add("is-obscured");
        container.classList.remove("opponent-hidden");
        container.setAttribute("aria-label", OPPONENT_PLACEHOLDER_ARIA_LABEL);
      }
    } catch {}
  });

  onBattleEvent("statSelected", async (e) => {
    try {
      console.log("[uiEventHandlers] statSelected event received");
    } catch {}
    try {
      scoreboard.clearTimer?.();
    } catch {}
    try {
      const detail = (e && e.detail) || {};
      const hasOpts = Object.prototype.hasOwnProperty.call(detail, "opts");
      const opts = hasOpts ? detail.opts || {} : {};
      const flagEnabled = isEnabled("opponentDelayMessage");
      const shouldDelay = flagEnabled && opts.delayOpponentMessage !== false;

      try {
        console.log(
          "[uiEventHandlers] flagEnabled:",
          flagEnabled,
          "shouldDelay:",
          shouldDelay,
          "opts.delayOpponentMessage:",
          opts.delayOpponentMessage
        );
      } catch {}

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

      console.log(
        "[uiEventHandlers] delaySource:",
        delaySource,
        "resolvedDelay:",
        resolvedDelay,
        "getOpponentDelay() result:",
        getOpponentDelay(),
        "getOpponentDelay function:",
        String(getOpponentDelay).slice(0, 100)
      );

      if (resolvedDelay <= 0) {
        console.log("[uiEventHandlers] resolvedDelay <= 0, calling displayOpponentChoosingPrompt immediately");
        displayOpponentChoosingPrompt();
        return;
      }

      const minDuration = Number(getOpponentPromptMinDuration());
      const scheduleDelay = Math.max(resolvedDelay, Number.isFinite(minDuration) ? minDuration : 0);

      const promptTimestamp = displayOpponentChoosingPrompt({
        markTimestamp: true,
        notifyReady: false
      });

      opponentSnackbarId = setTimeout(() => {
        try {
          if (Number.isFinite(promptTimestamp)) {
            recordOpponentPromptTimestamp(promptTimestamp);
          } else {
            markOpponentPromptNow();
          }
        } catch {
          // Marking failures are non-critical; keep the UX resilient to prompt tracker issues.
        }
      }, scheduleDelay);
    } catch {}
  });

  onBattleEvent("roundResolved", async (e) => {
    clearOpponentSnackbarTimeout();
    await revealOpponentCardAfterResolution();
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
    try {
      if (store && typeof store === "object") {
        delete store.__delayOpponentMessage;
      }
    } catch {}
  });
}
