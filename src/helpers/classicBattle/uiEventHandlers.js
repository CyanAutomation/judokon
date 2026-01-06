import { onBattleEvent, getBattleEventTarget } from "./battleEvents.js";
import { dispatchBattleEvent } from "./eventDispatcher.js";
import { getOpponentCardData } from "./opponentController.js";
import * as scoreboard from "../setupScoreboard.js";
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
let currentPickedSnackbarController = null;
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

        // Cancel any existing snackbars
        if (currentOpponentSnackbarController) {
          try {
            await currentOpponentSnackbarController.remove();
          } catch {
            // Non-critical
          }
          currentOpponentSnackbarController = null;
        }
        if (currentPickedSnackbarController) {
          try {
            await currentPickedSnackbarController.remove();
          } catch {
            // Non-critical
          }
          currentPickedSnackbarController = null;
        }

        // When no delay or flag disabled, show opponent message immediately (no "You Picked" message)
        if (!shouldDelay || opts.delayOpponentMessage === false) {
          currentOpponentSnackbarController = snackbarManager.show({
            message: opponentPromptMessage,
            priority: SnackbarPriority.HIGH,
            minDuration: 750,
            autoDismiss: 0,
            onShow: () => {
              try {
                markOpponentPromptNowFn({ notify: true });
              } catch {
                // Non-critical
              }
            }
          });

          // Wait for minimum display duration before allowing round to proceed
          if (currentOpponentSnackbarController) {
            await currentOpponentSnackbarController.waitForMinDuration();
          }
          // opponentDecisionReady will be dispatched by battleStateChange handler
          return;
        }

        const delaySource = Object.prototype.hasOwnProperty.call(opts, "delayMs")
          ? Number(opts.delayMs)
          : Number(getOpponentDelayFn());
        const resolvedDelay = Number.isFinite(delaySource) && delaySource > 0 ? delaySource : 0;

        if (resolvedDelay <= 0) {
          // Same as no delay case
          currentOpponentSnackbarController = snackbarManager.show({
            message: opponentPromptMessage,
            priority: SnackbarPriority.HIGH,
            minDuration: 750,
            autoDismiss: 0,
            onShow: () => {
              try {
                markOpponentPromptNowFn({ notify: true });
              } catch {
                // Non-critical
              }
            }
          });

          // Wait for minimum display duration before allowing round to proceed
          if (currentOpponentSnackbarController) {
            await currentOpponentSnackbarController.waitForMinDuration();
          }
          // opponentDecisionReady will be dispatched by battleStateChange handler
          return;
        }

        const minDuration = Number(getOpponentPromptMinDurationFn()) || 750;

        // Wait for the configured delay before showing opponent message
        await new Promise((resolve) => {
          opponentSnackbarId = setTimeout(() => {
            resolve();
          }, resolvedDelay);
        });

        // Show opponent choosing message with high priority
        currentOpponentSnackbarController = snackbarManager.show({
          message: opponentPromptMessage,
          priority: SnackbarPriority.HIGH,
          minDuration: minDuration,
          autoDismiss: 0, // Don't auto-dismiss, will be controlled by battle flow
          onShow: () => {
            // Mark timestamp when snackbar actually appears
            try {
              markOpponentPromptNowFn({ notify: true });
            } catch {
              // Non-critical
            }
          }
        });

        // Wait for minimum display duration before allowing round to proceed
        if (currentOpponentSnackbarController) {
          await currentOpponentSnackbarController.waitForMinDuration();
        }
        // opponentDecisionReady will be dispatched by battleStateChange handler
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

    // Remove both opponent choosing and picked snackbars if still active
    if (currentOpponentSnackbarController) {
      try {
        await currentOpponentSnackbarController.remove();
      } catch {
        // Non-critical
      }
      currentOpponentSnackbarController = null;
    }
    if (currentPickedSnackbarController) {
      try {
        await currentPickedSnackbarController.remove();
      } catch {
        // Non-critical
      }
      currentPickedSnackbarController = null;
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

  // Handle state transitions to dispatch opponentDecisionReady when appropriate
  onBattleEvent("battleStateChange", async (e) => {
    const { to } = e?.detail || {};

    // When entering waitingForOpponentDecision state, the opponent snackbar is already showing
    // and its minDuration has elapsed. Now we can safely dispatch opponentDecisionReady.
    if (to === "waitingForOpponentDecision") {
      // Add small delay to ensure state entry actions complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      try {
        await dispatchBattleEvent("opponentDecisionReady");
      } catch (err) {
        console.error("[battleStateChange Handler] Error dispatching opponentDecisionReady:", err);
      }
    }
  });
}

/**
 * Get the promise for the current statSelected handler execution.
 * This promise resolves when the `statSelected` event handler, which manages
 * the display of opponent-related snackbars and delays, has completed its
 * asynchronous operations. It is used by the battle flow to coordinate timing.
 *
 * @pseudocode
 * 1. Return the stored `statSelectedHandlerPromise`.
 *
 * @returns {Promise<void>|null} A Promise that resolves when the statSelected handler finishes, or null if no handler is currently active.
 */
export function getStatSelectedHandlerPromise() {
  return statSelectedHandlerPromise;
}

/**
 * Waits for the `statSelected` event handler to complete its asynchronous operations.
 * This ensures that any snackbars related to opponent's stat selection have been
 * processed and their minimum display durations respected before the battle flow proceeds.
 * After resolution, the internal `statSelectedHandlerPromise` is cleared.
 *
 * @pseudocode
 * 1. If `statSelectedHandlerPromise` exists, await its resolution.
 * 2. Clear `statSelectedHandlerPromise` after it resolves.
 *
 * @returns {Promise<void>} A Promise that resolves when the statSelected handler has finished.
 */
export async function awaitStatSelectedHandler() {
  if (statSelectedHandlerPromise) {
    await statSelectedHandlerPromise;
    statSelectedHandlerPromise = null;
  }
}

/**
 * Dismisses the currently active opponent-related snackbar controllers (both opponent choosing and picked snackbars).
 * This function is typically used by the countdown renderer or other components that need
 * to preemptively remove opponent messages, for example, to display a countdown timer.
 * Errors during snackbar removal are caught and ignored as they are non-critical.
 *
 * @pseudocode
 * 1. If `currentOpponentSnackbarController` exists, attempt to remove it and set to null.
 * 2. If `currentPickedSnackbarController` exists, attempt to remove it and set to null.
 * 3. Handle non-critical errors during removal attempts.
 *
 * @returns {Promise<void>} A Promise that resolves once any active snackbars have been dismissed.
 */
export async function dismissOpponentSnackbar() {
  if (currentOpponentSnackbarController) {
    try {
      await currentOpponentSnackbarController.remove();
    } catch {
      // Non-critical
    }
    currentOpponentSnackbarController = null;
  }
  if (currentPickedSnackbarController) {
    try {
      await currentPickedSnackbarController.remove();
    } catch {
      // Non-critical
    }
    currentPickedSnackbarController = null;
  }
}
