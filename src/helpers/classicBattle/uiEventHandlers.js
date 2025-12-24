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
  OPPONENT_PLACEHOLDER_ID
} from "./opponentPlaceholder.js";
import {
  getOpponentPromptFallbackTimerId,
  setOpponentPromptFallbackTimerId
} from "./globalState.js";
import { clearScheduled } from "./timerSchedule.js";

let opponentSnackbarId = 0;
let pendingOpponentCardData = null;

function clearOpponentSnackbarTimeout() {
  if (opponentSnackbarId) {
    clearTimeout(opponentSnackbarId);
  }
  opponentSnackbarId = 0;
}

function clearFallbackPromptTimer() {
  const id = getOpponentPromptFallbackTimerId();
  if (id) {
    clearScheduled(id);
  }
  setOpponentPromptFallbackTimerId(0);
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

/**
 * Bind dynamic UI helper event handlers on the shared battle EventTarget.
 *
 * @param {object} [deps] - Optional dependencies for testing (defaults to real implementations)
 * @param {Function} [deps.showSnackbar] - Function to display snackbar messages
 * @param {Function} [deps.t] - Translation function
 * @param {Function} [deps.markOpponentPromptNow] - Function to mark opponent prompt timestamp
 * @param {Function} [deps.recordOpponentPromptTimestamp] - Function to record timestamp
 * @param {Function} [deps.getOpponentPromptMinDuration] - Function to get minimum duration
 * @param {Function} [deps.isEnabled] - Function to check feature flags
 * @param {Function} [deps.getOpponentDelay] - Function to get opponent delay
 * @param {object} [deps.scoreboard] - Scoreboard utilities
 * @param {Function} [deps.getOpponentCardData] - Function to get opponent card data
 * @param {Function} [deps.renderOpponentCard] - Function to render opponent card
 * @param {Function} [deps.showRoundOutcome] - Function to show round outcome
 * @param {Function} [deps.showStatComparison] - Function to show stat comparison
 * @param {Function} [deps.updateDebugPanel] - Function to update debug panel
 * @param {Function} [deps.applyOpponentCardPlaceholder] - Function to apply placeholder
 *
 * @pseudocode
 * 1. Track EventTargets in a WeakSet to avoid duplicate bindings.
 * 2. Attach listeners for opponent reveal, stat selection, and round resolution.
 * 3. Render opponent card, show snackbar messages, and update debug panel.
 *
 * @returns {void}
 */
export function bindUIHelperEventHandlersDynamic(deps = {}) {
  // Use provided dependencies or fall back to default imports
  const {
    showSnackbar: showSnackbarFn = showSnackbar,
    t: tFn = t,
    markOpponentPromptNow: markOpponentPromptNowFn = markOpponentPromptNow,
    recordOpponentPromptTimestamp: recordOpponentPromptTimestampFn = recordOpponentPromptTimestamp,
    getOpponentPromptMinDuration: getOpponentPromptMinDurationFn = getOpponentPromptMinDuration,
    isEnabled: isEnabledFn = isEnabled,
    getOpponentDelay: getOpponentDelayFn = getOpponentDelay,
    scoreboard: scoreboardObj = scoreboard,
    getOpponentCardData: getOpponentCardDataFn = getOpponentCardData,
    renderOpponentCard: renderOpponentCardFn = renderOpponentCard,
    showRoundOutcome: showRoundOutcomeFn = showRoundOutcome,
    showStatComparison: showStatComparisonFn = showStatComparison,
    updateDebugPanel: updateDebugPanelFn = updateDebugPanel,
    applyOpponentCardPlaceholder: applyOpponentCardPlaceholderFn = applyOpponentCardPlaceholder
  } = deps;
  // Ensure we only bind once per EventTarget instance
  let target;
  try {
    const KEY = "__cbUIHelpersDynamicBoundTargets";
    target = getBattleEventTarget();
    const set = (globalThis[KEY] ||= new WeakSet());
    
    // DIAGNOSTIC: Log WeakSet guard decision
    const targetId = target?.__debugId || "NO_ID";
    const hasTarget = set.has(target);
    
    console.log(`[Handler Registration] Target: ${targetId}, In WeakSet: ${hasTarget}`);
    
    if (hasTarget) {
      console.log(`[Handler Registration] EARLY RETURN - Target ${targetId} already has handlers`);
      return;
    }
    
    console.log(`[Handler Registration] PROCEEDING - Will register handlers on ${targetId}`);
    set.add(target);
  } catch (err) {
    // Log binding failure but continue to register handlers
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn("[bindUIHelperEventHandlersDynamic] WeakSet tracking failed:", err);
    }
    // Still try to get target if not already set
    if (!target) {
      try {
        target = getBattleEventTarget();
      } catch {
        // Cannot proceed without target
        return;
      }
    }
  }

  // Create local helper that uses injected dependencies
  async function revealOpponentCardAfterResolution() {
    const container = document.getElementById("opponent-card");
    if (!container) {
      pendingOpponentCardData = null;
      return;
    }
    let cardData = pendingOpponentCardData;
    if (!cardData) {
      try {
        cardData = await getOpponentCardDataFn();
      } catch {
        cardData = null;
      }
    }
    if (cardData) {
      try {
        await renderOpponentCardFn(cardData, container);
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

  // Create local helper that uses injected dependencies
  function displayOpponentChoosingPrompt({ markTimestamp = true, notifyReady = true } = {}) {
    // DIAGNOSTIC: Log that function was called
    console.log("[displayOpponentChoosingPrompt] Called", {
      markTimestamp,
      notifyReady,
      showSnackbarFnExists: typeof showSnackbarFn === "function"
    });
    
    try {
      const message = tFn("ui.opponentChoosing");
      console.log("[displayOpponentChoosingPrompt] Calling showSnackbar with:", message);
      showSnackbarFn(message);
      console.log("[displayOpponentChoosingPrompt] showSnackbar completed successfully");
    } catch (err) {
      console.error("[displayOpponentChoosingPrompt] Primary showSnackbar failed:", err);
      // Fallback: try with hardcoded message if translation fails
      try {
        console.log("[displayOpponentChoosingPrompt] Trying fallback message");
        showSnackbarFn("Opponent is choosing…");
        console.log("[displayOpponentChoosingPrompt] Fallback showSnackbar completed");
      } catch (fallbackErr) {
        console.error("[displayOpponentChoosingPrompt] Fallback also failed:", fallbackErr);
        // Final fallback: log to console in development
        if (typeof console !== "undefined" && typeof console.warn === "function") {
          try {
            console.warn("[displayOpponentChoosingPrompt] Failed to show snackbar:", err);
          } catch {}
        }
      }
    }
    let recordedTimestamp;
    if (markTimestamp) {
      try {
        recordedTimestamp = markOpponentPromptNowFn({ notify: notifyReady });
      } catch {
        // Marking failures are non-critical; keep the UX resilient to prompt tracker issues.
      }
    }
    return recordedTimestamp;
  }

  onBattleEvent("opponentReveal", async () => {
    const container = document.getElementById("opponent-card");
    try {
      pendingOpponentCardData = await getOpponentCardDataFn();
    } catch {
      pendingOpponentCardData = null;
    }
    try {
      if (container && !container.querySelector(`#${OPPONENT_PLACEHOLDER_ID}`)) {
        applyOpponentCardPlaceholderFn(container);
      }
    } catch {}
    try {
      if (container) {
        container.classList.add("is-obscured");
        container.classList.remove("opponent-hidden");
      }
    } catch {}
  });

  onBattleEvent("statSelected", async (e) => {
    // DIAGNOSTIC: Log that handler was called
    console.log("[statSelected Handler] Event received", {
      detail: e?.detail,
      timestamp: Date.now()
    });
    
    try {
      scoreboardObj.clearTimer?.();
    } catch {
      // Timer clearing is non-critical
    }
    try {
      const detail = (e && e.detail) || {};
      const hasOpts = Object.prototype.hasOwnProperty.call(detail, "opts");
      const opts = hasOpts ? detail.opts || {} : {};
      const flagEnabled = isEnabledFn("opponentDelayMessage");
      const shouldDelay = flagEnabled && opts.delayOpponentMessage !== false;

      clearOpponentSnackbarTimeout();
      clearFallbackPromptTimer();

      if (!shouldDelay) {
        console.log("[statSelected Handler] No delay - calling displayOpponentChoosingPrompt immediately");
        displayOpponentChoosingPrompt();
        return;
      }

      const delaySource = Object.prototype.hasOwnProperty.call(opts, "delayMs")
        ? Number(opts.delayMs)
        : Number(getOpponentDelayFn());
      const resolvedDelay = Number.isFinite(delaySource) && delaySource > 0 ? delaySource : 0;

      if (resolvedDelay <= 0) {
        console.log("[statSelected Handler] Resolved delay <= 0 - calling displayOpponentChoosingPrompt immediately");
        displayOpponentChoosingPrompt();
        return;
      }

      console.log(`[statSelected Handler] Scheduling displayOpponentChoosingPrompt with delay: ${resolvedDelay}ms`);
      const minDuration = Number(getOpponentPromptMinDurationFn());
      const scheduleDelay = Math.max(resolvedDelay, Number.isFinite(minDuration) ? minDuration : 0);

      const promptTimestamp = displayOpponentChoosingPrompt({
        markTimestamp: true,
        notifyReady: false
      });

      opponentSnackbarId = setTimeout(() => {
        try {
          if (Number.isFinite(promptTimestamp)) {
            recordOpponentPromptTimestampFn(promptTimestamp);
          } else {
            markOpponentPromptNowFn();
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
        showStatComparisonFn(store, stat, numericPlayer, numericOpponent);
      }
    } catch {}
    try {
      showRoundOutcomeFn(result.message || "", stat, playerVal, opponentVal);
      updateDebugPanelFn();
    } catch {}
    try {
      if (store && typeof store === "object") {
        delete store.__delayOpponentMessage;
      }
    } catch {}
  });
}
