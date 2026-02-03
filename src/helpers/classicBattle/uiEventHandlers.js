import { onBattleEvent } from "./battleEvents.js";
import { getOpponentCardData } from "./opponentController.js";
import * as scoreboard from "../setupScoreboard.js";
import { t } from "../i18n.js";
import { renderOpponentCard, showStatComparison } from "./uiHelpers.js";
import { updateDebugPanel } from "./debugPanel.js";
import { markOpponentPromptNow, getOpponentPromptMinDuration } from "./opponentPromptTracker.js";
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
let pendingOpponentCardDataSequence = 0;
let pendingOpponentCardDataToken = null;
let pendingOpponentCardDataTokenSequence = 0;
let currentOpponentSnackbarController = null;
let currentPickedSnackbarController = null;
let statSelectedHandlerPromise = null;
let opponentDelayController = null;
let statSelectedSequence = 0;
let opponentRevealSequence = 0;
const DEFAULT_MIN_OBSCURE_DURATION_MS = 16;
let lastOpponentRevealTimestamp = 0;
let lastNowValue = Date.now() || 0;

function clearOpponentSnackbarTimeout() {
  if (opponentSnackbarId) {
    clearTimeout(opponentSnackbarId);
  }
  if (opponentDelayController) {
    opponentDelayController.canceled = true;
    if (typeof opponentDelayController.resolve === "function") {
      opponentDelayController.resolve();
    }
  }
  opponentSnackbarId = 0;
  opponentDelayController = null;
}

function clearFallbackPromptTimer() {
  const id = getOpponentPromptFallbackTimerId();
  if (id) {
    clearScheduled(id);
  }
  setOpponentPromptFallbackTimerId(0);
}

function createPendingOpponentCardDataToken() {
  pendingOpponentCardDataTokenSequence += 1;
  return pendingOpponentCardDataTokenSequence;
}

function setPendingOpponentCardData(cardData, sequence, token) {
  pendingOpponentCardData = cardData;
  if (Number.isFinite(sequence)) {
    pendingOpponentCardDataSequence = sequence;
  }
  if (token !== undefined) {
    pendingOpponentCardDataToken = token;
  }
}

function clearPendingOpponentCardData(sequence, token) {
  const isSequenceClearable =
    !Number.isFinite(sequence) || pendingOpponentCardDataSequence < sequence;
  const isTokenMatch = token === undefined || pendingOpponentCardDataToken === token;
  if (isSequenceClearable && isTokenMatch) {
    pendingOpponentCardData = null;
    pendingOpponentCardDataSequence = 0;
    pendingOpponentCardDataToken = null;
  }
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

function now() {
  try {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      const value = performance.now();
      if (Number.isFinite(value)) {
        lastNowValue = value;
        return value;
      }
    }
  } catch {}
  try {
    if (typeof Date !== "undefined" && typeof Date.now === "function") {
      const value = Date.now();
      if (Number.isFinite(value)) {
        lastNowValue = value;
        return value;
      }
    }
  } catch {}
  return lastNowValue || 0;
}

function getMinOpponentObscureDuration() {
  if (typeof window !== "undefined") {
    const configOverride = window.__JUDOKON_TEST_CONFIG__?.minOpponentObscureDurationMs;
    if (Number.isFinite(configOverride) && configOverride >= 0) {
      return Number(configOverride);
    }
    const override = window.__MIN_OPPONENT_OBSCURE_DURATION_MS;
    if (Number.isFinite(override) && override >= 0) {
      return Number(override);
    }
  }
  return DEFAULT_MIN_OBSCURE_DURATION_MS;
}

async function waitForMinimumOpponentObscureDuration() {
  if (!Number.isFinite(lastOpponentRevealTimestamp)) {
    return;
  }
  const minDuration = Math.max(getMinOpponentObscureDuration(), DEFAULT_MIN_OBSCURE_DURATION_MS);
  if (!Number.isFinite(minDuration) || minDuration <= 0) {
    return;
  }
  const elapsed = now() - lastOpponentRevealTimestamp;
  const remaining = minDuration - elapsed;
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

/**
 * Bind dynamic UI helper event handlers on the shared battle EventTarget.
 *
 * @param {object} [deps] - Optional dependencies for testing (defaults to real implementations)
 * @param {Function} [deps.t] - Translation function
 * @param {Function} [deps.markOpponentPromptNow] - Function to mark opponent prompt timestamp
 * @param {Function} [deps.recordOpponentPromptTimestamp] - Function to record timestamp
 * @param {Function} [deps.getOpponentPromptMinDuration] - Function to get minimum duration
 * @param {object} [deps.scoreboard] - Scoreboard utilities
 * @param {Function} [deps.updateSnackbar] - Function to update snackbar messages
 * @param {Function} [deps.getOpponentCardData] - Function to get opponent card data
 * @param {Function} [deps.renderOpponentCard] - Function to render opponent card
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
    scoreboard: scoreboardObj = scoreboard,
    getOpponentCardData: getOpponentCardDataFn = getOpponentCardData,
    renderOpponentCard: renderOpponentCardFn = renderOpponentCard,
    showStatComparison: showStatComparisonFn = showStatComparison,
    updateDebugPanel: updateDebugPanelFn = updateDebugPanel,
    applyOpponentCardPlaceholder: applyOpponentCardPlaceholderFn = applyOpponentCardPlaceholder
  } = deps;

  // Get the event target - each __resetBattleEventTarget() call creates a fresh EventTarget with no handlers
  // Contract: Always call __resetBattleEventTarget() before binding handlers to ensure clean state

  // Create local helper that uses injected dependencies
  async function revealOpponentCardAfterResolution(selectionToken) {
    const revealSequence = ++opponentRevealSequence;
    const isCurrentReveal = () => revealSequence === opponentRevealSequence;
    const container = document.getElementById("opponent-card");
    if (!container) {
      clearPendingOpponentCardData(undefined, selectionToken);
      return;
    }
    const capturedToken = pendingOpponentCardDataToken;
    if (selectionToken !== undefined && selectionToken !== capturedToken) {
      return;
    }
    const capturedCardData = pendingOpponentCardData;
    let cardData = capturedCardData;
    if (!cardData) {
      try {
        cardData = await getOpponentCardDataFn();
      } catch {
        cardData = null;
      }
    }
    if (!isCurrentReveal()) {
      clearPendingOpponentCardData(revealSequence, selectionToken);
      return;
    }
    const tokenMatches = selectionToken === undefined || selectionToken === capturedToken;
    const resolvedCardData = tokenMatches ? cardData : capturedCardData;
    if (!resolvedCardData) {
      return;
    }
    try {
      await renderOpponentCardFn(resolvedCardData, container);
    } catch {
      clearPendingOpponentCardData(undefined, selectionToken);
      return;
    }
    try {
      await renderOpponentCardFn(resolvedCardData, container);
    } catch {
      clearPendingOpponentCardData(undefined, selectionToken);
      return;
    }
    await waitForMinimumOpponentObscureDuration();
    await waitForNextFrame();
    if (!isCurrentReveal()) {
      clearPendingOpponentCardData(revealSequence, selectionToken);
      return;
    }
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
    if (tokenMatches) {
      clearPendingOpponentCardData(undefined, selectionToken);
    }
    lastOpponentRevealTimestamp = 0;
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
    const revealSequence = ++opponentRevealSequence;
    const isCurrentReveal = () => revealSequence === opponentRevealSequence;
    const revealToken = createPendingOpponentCardDataToken();
    setPendingOpponentCardData(null, revealSequence, revealToken);
    const container = document.getElementById("opponent-card");
    try {
      if (container && !container.querySelector(`#${OPPONENT_PLACEHOLDER_ID}`)) {
        applyOpponentCardPlaceholderFn(container);
      }
    } catch {}
    try {
      if (!isCurrentReveal()) {
        return;
      }
      if (container) {
        lastOpponentRevealTimestamp = now();
        container.classList.add("is-obscured");
        container.classList.remove("opponent-hidden");
      }
    } catch {}
    try {
      if (!isCurrentReveal()) {
        return;
      }
      const opponentCardData = await getOpponentCardDataFn();
      if (!isCurrentReveal()) {
        clearPendingOpponentCardData(revealSequence, revealToken);
        return;
      }
      setPendingOpponentCardData(opponentCardData, revealSequence, revealToken);
    } catch {
      clearPendingOpponentCardData(revealSequence, revealToken);
    }
  });

  onBattleEvent("statSelected", async (e) => {
    const handlerSequence = ++statSelectedSequence;
    const isCurrentHandler = () => handlerSequence === statSelectedSequence;
    // Create promise that resolves when handler completes
    const handlerPromise = (async () => {
      try {
        if (!isCurrentHandler()) {
          return;
        }
        scoreboardObj.clearTimer?.();
      } catch {
        // Timer clearing is non-critical
      }

      try {
        const opponentPromptMessage = tFn("ui.opponentChoosing");
        const detail = (e && e.detail) || {};
        const hasOpts = Object.prototype.hasOwnProperty.call(detail, "opts");
        const opts = hasOpts ? detail.opts || {} : {};

        if (!isCurrentHandler()) {
          return;
        }
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

        if (!isCurrentHandler()) {
          return;
        }
        const minDuration = Number(getOpponentPromptMinDurationFn()) || 750;

        // Show opponent choosing message immediately; reveal timing happens in round resolution.
        currentOpponentSnackbarController = snackbarManager.show({
          message: opponentPromptMessage,
          priority: SnackbarPriority.HIGH,
          minDuration,
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
    const selectionToken = pendingOpponentCardDataToken;
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

    await revealOpponentCardAfterResolution(selectionToken);
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
