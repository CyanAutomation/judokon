import { onBattleEvent, getBattleEventTarget } from "./battleEvents.js";
import { getOpponentCardData } from "./opponentController.js";
import * as scoreboard from "../setupScoreboard.js";
import { showSnackbar } from "../showSnackbar.js";
import { t } from "../i18n.js";
import { renderOpponentCard, showRoundOutcome, showStatComparison } from "./uiHelpers.js";
import { updateDebugPanel } from "./debugPanel.js";
import { getOpponentDelay } from "./snackbar.js";
import { markOpponentPromptNow, getOpponentPromptMinDuration } from "./opponentPromptTracker.js";
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
import snackbarManager, { SnackbarPriority } from "../SnackbarManager.js";

let opponentSnackbarId = 0;
let pendingOpponentCardData = null;
let currentOpponentSnackbarController = null;
let statSelectedHandlerPromise = null;

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
 * @param {Function} [deps.updateSnackbar] - Function to update snackbar messages
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
  /**
   * Display opponent prompt message in snackbar.
   *
   * Prefers updateSnackbar() over showSnackbar() to provide smooth message transitions
   * (e.g., "Choose your stat" → "Opponent is choosing…"). updateSnackbar() updates the
   * existing snackbar element while showSnackbar() creates a new element, which can
   * cause visual flicker during rapid message changes.
   *
   * @param {string} message - The message to display
   * @returns {void}
   *
   * @pseudocode
   * 1. Try updateSnackbar first (preferred for smooth transitions)
   * 2. Fall back to showSnackbar if updateSnackbar unavailable
   * 3. On error, attempt hardcoded fallback message
   * 4. Log diagnostic warnings for debugging
   */
  function showOpponentPromptMessage(message) {
    try {
      // Always use showSnackbar to replace any existing message
      // updateSnackbar can fail if the internal bar reference is stale
      showSnackbarFn(message);
    } catch (err) {
      console.error("[showOpponentPromptMessage] Snackbar update failed:", err);
      // Final fallback: log to console in development
      if (typeof console !== "undefined" && typeof console.warn === "function") {
        try {
          console.warn("[showOpponentPromptMessage] Failed to show snackbar:", err);
        } catch {}
      }
    }
  }

  function displayOpponentChoosingPrompt({
    markTimestamp = true,
    notifyReady = true,
    showMessage = true,
    message
  } = {}) {
    // DIAGNOSTIC: Log that function was called
    console.log("[displayOpponentChoosingPrompt] Called", {
      markTimestamp,
      notifyReady,
      showMessage,
      showSnackbarFnExists: typeof showSnackbarFn === "function"
    });

    const resolvedMessage = message ?? tFn("ui.opponentChoosing");
    if (showMessage) {
      console.log("[displayOpponentChoosingPrompt] Updating snackbar with:", resolvedMessage);
      showOpponentPromptMessage(resolvedMessage);
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

  function showPromptAndCaptureTimestamp(message, options = {}) {
    showOpponentPromptMessage(message);
    return displayOpponentChoosingPrompt({
      message,
      ...options,
      showMessage: false
    });
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

    // Create promise that resolves when handler completes
    const handlerPromise = (async () => {
      try {
        scoreboardObj.clearTimer?.();
      } catch {
        // Timer clearing is non-critical
      }

      try {
        const opponentPromptMessage = tFn("ui.opponentChoosing");
        const detail = (e && e.detail) || {};
        const hasOpts = Object.prototype.hasOwnProperty.call(detail, "opts");
        const opts = hasOpts ? detail.opts || {} : {};
        const flagEnabled = isEnabledFn("opponentDelayMessage");
        const shouldDelay = flagEnabled && opts.delayOpponentMessage !== false;

        clearOpponentSnackbarTimeout();
        clearFallbackPromptTimer();

        // Cancel any existing opponent snackbar
        if (currentOpponentSnackbarController) {
          try {
            await currentOpponentSnackbarController.remove();
          } catch {
            // Non-critical
          }
          currentOpponentSnackbarController = null;
        }

        if (!shouldDelay) {
          console.log(
            "[statSelected Handler] No delay - showing opponent prompt immediately"
          );
          showPromptAndCaptureTimestamp(opponentPromptMessage);
          return;
        }

        const delaySource = Object.prototype.hasOwnProperty.call(opts, "delayMs")
          ? Number(opts.delayMs)
          : Number(getOpponentDelayFn());
        const resolvedDelay = Number.isFinite(delaySource) && delaySource > 0 ? delaySource : 0;

        if (resolvedDelay <= 0) {
          console.log(
            "[statSelected Handler] Resolved delay <= 0 - showing opponent prompt immediately"
          );
          showPromptAndCaptureTimestamp(opponentPromptMessage);
          return;
        }

        console.log(
          `[statSelected Handler] Scheduling message to appear after delay: ${resolvedDelay}ms`
        );

        const minDuration = Number(getOpponentPromptMinDurationFn()) || 750;

        // Use promise-based delay coordination
        await new Promise((resolve) => {
          opponentSnackbarId = setTimeout(() => {
            resolve();
          }, resolvedDelay);
        });

        // Show snackbar with high priority and minimum duration
        console.log("[statSelected Handler] Showing snackbar with SnackbarManager");
        currentOpponentSnackbarController = snackbarManager.show({
          message: opponentPromptMessage,
          priority: SnackbarPriority.HIGH,
          minDuration: minDuration,
          autoDismiss: 0, // Don't auto-dismiss, will be controlled by battle flow
          onShow: () => {
            console.log("[statSelected Handler] Snackbar shown, marking timestamp");
            // Mark timestamp when snackbar actually appears
            try {
              markOpponentPromptNowFn({ notify: true });
            } catch {
              // Non-critical
            }
          }
        });

        // Wait for minimum display duration before allowing round to proceed
        console.log(`[statSelected Handler] Waiting for minimum duration: ${minDuration}ms`);
        if (currentOpponentSnackbarController) {
          await currentOpponentSnackbarController.waitForMinDuration();
        }
        console.log("[statSelected Handler] Minimum duration elapsed, round can proceed");
      } catch (error) {
        console.error("[statSelected Handler] Error:", error);
      }
    })();

    // Store promise so battle flow can await it
    statSelectedHandlerPromise = handlerPromise;

    // Return promise for coordination
    return handlerPromise;
  });

  onBattleEvent("roundResolved", async (e) => {
    clearOpponentSnackbarTimeout();

    // Remove opponent choosing snackbar if still active
    if (currentOpponentSnackbarController) {
      try {
        await currentOpponentSnackbarController.remove();
      } catch {
        // Non-critical
      }
      currentOpponentSnackbarController = null;
    }

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

/**
 * Get the promise for the current statSelected handler execution
 * Used by battle flow to coordinate timing
 *
 * @returns {Promise|null} Handler promise or null if no handler active
 */
export function getStatSelectedHandlerPromise() {
  return statSelectedHandlerPromise;
}

/**
 * Wait for statSelected handler to complete
 * Used by battle flow to ensure snackbar timing is respected
 *
 * @returns {Promise<void>}
 */
export async function awaitStatSelectedHandler() {
  if (statSelectedHandlerPromise) {
    await statSelectedHandlerPromise;
    statSelectedHandlerPromise = null;
  }
}
