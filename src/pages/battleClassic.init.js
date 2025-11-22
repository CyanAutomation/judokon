import { createCountdownTimer, getDefaultTimer } from "../helpers/timerUtils.js";
import {
  createBattleStore,
  startCooldown,
  startRound,
  handleReplay
} from "../helpers/classicBattle/roundManager.js";
import { computeRoundResult } from "../helpers/classicBattle/roundResolver.js";
// Removed duplicate import of handleStatSelection
import {
  disableStatButtons,
  setStatButtonsEnabled,
  resolveStatButtonsReady,
  wireStatHotkeys
} from "../helpers/classicBattle/statButtons.js";
import { quitMatch } from "../helpers/classicBattle/quitModal.js";
import { bindUIHelperEventHandlersDynamic } from "../helpers/classicBattle/uiEventHandlers.js";
import { initDebugPanel } from "../helpers/classicBattle/debugPanel.js";
import { showEndModal } from "../helpers/classicBattle/endModal.js";
import { updateScore, updateRoundCounter } from "../helpers/setupScoreboard.js";
import { setupScoreboard } from "../helpers/setupScoreboard.js";
import { syncScoreboardDisplay } from "../helpers/classicBattle/scoreDisplay.js";
import { resetFallbackScores } from "../helpers/api/battleUI.js";
import {
  createBattleEngine,
  STATS,
  on as onEngine,
  getRoundsPlayed,
  isMatchEnded,
  getScores
} from "../helpers/battleEngineFacade.js";
import { initRoundSelectModal } from "../helpers/classicBattle/roundSelectModal.js";
import { startTimer, onNextButtonClick } from "../helpers/classicBattle/timerService.js";
import { emitBattleEvent, onBattleEvent } from "../helpers/classicBattle/battleEvents.js";
import { initScoreboardAdapter } from "../helpers/classicBattle/scoreboardAdapter.js";
import { bridgeEngineEvents } from "../helpers/classicBattle/engineBridge.js";
import { initFeatureFlags, isEnabled } from "../helpers/featureFlags.js";
import { exposeTestAPI } from "../helpers/testApi.js";
import { showSnackbar } from "../helpers/showSnackbar.js";
import { initDebugFlagHud } from "../helpers/debugFlagHud.js";
import { safeExecute, ERROR_LEVELS } from "../helpers/classicBattle/safeExecute.js";
import {
  getOpponentPromptFallbackTimerId,
  setOpponentPromptFallbackTimerId,
  setLastRoundCycleTrigger
} from "../helpers/classicBattle/globalState.js";
import {
  updateRoundCounterFromEngine,
  resetRoundCounterTracking
} from "../helpers/classicBattle/roundTracker.js";
import { recordJudokaLoadFailureTelemetry } from "../helpers/classicBattle/judokaTelemetry.js";
import {
  getCurrentTimestamp,
  scheduleDelayed,
  clearScheduled
} from "../helpers/classicBattle/timerSchedule.js";

function updateTimerFallback(value) {
  try {
    const el = document.getElementById("next-round-timer");
    if (!el) return;
    const valueSpan = el.querySelector('[data-part="value"]');
    const labelSpan = el.querySelector('[data-part="label"]');
    if (valueSpan) {
      const hasValue = typeof value === "string" && value.length > 0;
      valueSpan.textContent = value;
      if (labelSpan) {
        labelSpan.textContent = hasValue ? "Time Left:" : "";
      }
      const separator = labelSpan?.nextSibling;
      if (hasValue) {
        if (!separator || separator.nodeType !== 3) {
          const doc = el.ownerDocument || document;
          el.insertBefore(doc.createTextNode(" "), valueSpan);
        } else if (!/\s/.test(separator.textContent || "")) {
          separator.textContent = " ";
        }
      } else if (separator && separator.nodeType === 3) {
        el.removeChild(separator);
      }
    } else {
      el.textContent = value ? `Time Left: ${value}` : "";
    }
  } catch {}
}
import { t } from "../helpers/i18n.js";
import {
  showSelectionPrompt,
  getOpponentDelay,
  setOpponentDelay
} from "../helpers/classicBattle/snackbar.js";
import {
  removeBackdrops,
  enableNextRoundButton,
  disableNextRoundButton,
  showFatalInitError,
  setNextButtonFinalizedState
} from "../helpers/classicBattle/uiHelpers.js";
import {
  handleStatSelection,
  getPlayerAndOpponentValues,
  isOrchestratorActive
} from "../helpers/classicBattle/selectionHandler.js";
import setupScheduler from "../helpers/classicBattle/setupScheduler.js";
import {
  recordOpponentPromptTimestamp,
  getOpponentPromptTimestamp,
  resetOpponentPromptTimestamp,
  getOpponentPromptMinDuration
} from "../helpers/classicBattle/opponentPromptTracker.js";
import {
  CARD_RETRY_EVENT,
  LOAD_ERROR_EXIT_EVENT,
  JudokaDataLoadError
} from "../helpers/classicBattle/cardSelection.js";
import { isDevelopmentEnvironment } from "../helpers/environment.js";

function broadcastBattleState(state) {
  let from = null;
  try {
    from = typeof document !== "undefined" ? (document.body?.dataset?.battleState ?? null) : null;
  } catch {}
  const detail = { from, to: state };
  emitBattleEvent("battleStateChange", detail);
  try {
    if (typeof document !== "undefined") {
      document.body.dataset.battleState = state;
    }
  } catch (e) {
    // ignore, this is a non-critical side-effect
    console.warn(`Failed to set battleState on body`, e);
  }
}

// Store the active selection timer for cleanup when stat selection occurs
let activeSelectionTimer = null;
// Track the failsafe timeout so it can be cancelled when the timer resolves
let failSafeTimerId = null;
// Re-entrancy guard to avoid starting multiple round cycles concurrently
let isStartingRoundCycle = false;
let detachStatHotkeys;

const READY_SUPPRESSION_WINDOW_MS = (() => {
  if (typeof window === "undefined") {
    return 200;
  }
  try {
    const override = window.__READY_SUPPRESSION_WINDOW_MS;
    return typeof override === "number" ? override : 200;
  } catch {
    return 200;
  }
})();

let hasLoggedFinalizeSelectionUpdateFailure = false;
// Track manual round start for ready event suppression
let lastManualRoundStartTimestamp = 0;

/**
 * Waits for the stat buttons hydration promise (when present) so UI updates
 * don't race ahead of component initialization.
 * @pseudocode await (window.statButtonsReadyPromise || Promise.resolve())
 */
async function waitForStatButtonsReady() {
  const statButtonsReadyPromise =
    typeof window !== "undefined" && window.statButtonsReadyPromise
      ? window.statButtonsReadyPromise
      : Promise.resolve();
  await statButtonsReadyPromise;
}

function clearOpponentPromptFallbackTimer() {
  if (typeof window === "undefined") return;
  const id = getOpponentPromptFallbackTimerId();
  if (id) {
    clearScheduled(id);
  }
  setOpponentPromptFallbackTimerId(0);
}
/**
 * Toggle header navigation interactivity.
 *
 * @param {boolean} locked
 */
function setHeaderNavigationLocked(locked) {
  if (typeof document === "undefined") {
    return;
  }
  try {
    const headerLinks = document.querySelectorAll("header a");
    headerLinks.forEach((link) => {
      link.style.pointerEvents = locked ? "none" : "";
    });
  } catch {}
}

// Wire Main Menu button to quit flow
function bindHomeButton(store) {
  try {
    const homeBtn = document.getElementById("home-button");
    if (!homeBtn) return;
    if (!homeBtn.__boundQuit) {
      homeBtn.addEventListener("click", () => {
        try {
          quitMatch(store, homeBtn);
        } catch {}
      });
      homeBtn.__boundQuit = true;
    }
  } catch {}
}

/**
 * Buffer time added to opponent delay to ensure snackbar message is visible.
 * Prevents UI elements from changing too quickly for user comprehension.
 */
const POST_SELECTION_READY_DELAY_MS = 48;
const OPPONENT_MESSAGE_BUFFER_MS = 150;

const BASE_SELECTION_READY_DELAY_MS = Math.max(
  POST_SELECTION_READY_DELAY_MS,
  OPPONENT_MESSAGE_BUFFER_MS
);

function calculateRemainingOpponentMessageTime() {
  try {
    const now = getCurrentTimestamp();
    const lastPrompt = getOpponentPromptTimestamp() || 0;
    const elapsed = now - lastPrompt;
    return Math.max(0, getOpponentPromptMinDuration() - elapsed);
  } catch {}
  return 0;
}

function recordRoundCycleTrigger(source) {
  const timestamp = getCurrentTimestamp();
  setLastRoundCycleTrigger(source, timestamp);
  if (typeof window !== "undefined") {
    try {
      window.__lastRoundCycleTrigger = {
        source,
        timestamp
      };
    } catch (error) {
      safeExecute(
        () => {
          console.warn("battleClassic: failed to persist lastRoundCycleTrigger", {
            error,
            source,
            timestamp
          });
        },
        "recordRoundCycleTrigger persist",
        ERROR_LEVELS.SILENT
      );
    }
  }
}

function handleCooldownError(store, reason, err) {
  try {
    store[COOLDOWN_FLAG] = false;
  } catch {}
  try {
    console.debug("battleClassic: startCooldown manual trigger failed", {
      reason: reason || "unknown",
      error: err
    });
  } catch {}
}

function invokeStartCooldown(store, reason) {
  try {
    startCooldown(store);
    return true;
  } catch (err) {
    handleCooldownError(store, reason, err);
    return false;
  }
}

function scheduleDelayedCooldown(delayMs, store, reason) {
  const runner = () => invokeStartCooldown(store, reason);

  try {
    if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
      window.setTimeout(runner, delayMs);
      return true;
    }
  } catch {}

  try {
    setTimeout(runner, delayMs);
    return true;
  } catch {}

  return false;
}

function computeSelectionReadyDelay() {
  let delayForReady = BASE_SELECTION_READY_DELAY_MS;
  try {
    const opponentDelay = getOpponentDelay?.();
    if (Number.isFinite(opponentDelay) && opponentDelay >= 0) {
      delayForReady = Math.max(delayForReady, opponentDelay + OPPONENT_MESSAGE_BUFFER_MS);
    }
  } catch {}
  return Math.max(delayForReady, getOpponentPromptMinDuration());
}

const COOLDOWN_FLAG = "__uiCooldownStarted";

function resolveStatValues(store, stat) {
  const { playerVal, opponentVal } = getPlayerAndOpponentValues(stat, undefined, undefined, {
    store
  });

  return {
    playerVal: Number.isFinite(playerVal) ? playerVal : 0,
    opponentVal: Number.isFinite(opponentVal) ? opponentVal : 0
  };
}

function resetCooldownFlag(store) {
  if (!store || typeof store !== "object") return;
  try {
    store[COOLDOWN_FLAG] = false;
  } catch {}
}

function markCooldownStarted(store) {
  if (!store || typeof store !== "object") return false;
  if (store[COOLDOWN_FLAG]) return false;
  try {
    store[COOLDOWN_FLAG] = true;
  } catch {
    return false;
  }
  return true;
}

function triggerCooldownOnce(store, reason) {
  if (!markCooldownStarted(store)) return false;

  const remaining = calculateRemainingOpponentMessageTime();
  const shouldForceImmediate = reason === "statSelectionFailed";

  let triggered = false;

  if (!shouldForceImmediate && remaining > 0) {
    triggered = scheduleDelayedCooldown(remaining, store, reason);
  }

  if (!triggered) {
    triggered = invokeStartCooldown(store, reason);
  }

  if (triggered) {
    broadcastBattleState("cooldown");
  }

  return triggered;
}

function getNextRoundButton() {
  try {
    return (
      document.getElementById("next-button") || document.querySelector('[data-role="next-round"]')
    );
  } catch {
    return null;
  }
}

const NEXT_FINALIZED_STATE = Object.freeze({
  PENDING: "pending",
  COMPLETE: "true"
});

function setNextButtonReadyAttributes(btn) {
  if (!btn) return;
  try {
    btn.disabled = false;
  } catch {}
  try {
    btn.removeAttribute("disabled");
  } catch {}
  try {
    btn.setAttribute("data-next-ready", "true");
    if (btn.dataset) {
      btn.dataset.nextReady = "true";
      btn.dataset.nextFinalized = NEXT_FINALIZED_STATE.PENDING;
    }
  } catch {}
}

function safeEnableNextRoundButton(context) {
  try {
    enableNextRoundButton();
    return true;
  } catch (err) {
    try {
      console.debug(`battleClassic: enableNextRoundButton after ${context} failed`, err);
    } catch {}
    return false;
  }
}

function prepareNextButtonForUse(context) {
  const btn = getNextRoundButton();
  safeEnableNextRoundButton(context);
  setNextButtonReadyAttributes(btn);
  return btn;
}

function logNextButtonRecovery(context, btn, extra = {}) {
  if (!btn) return;
  try {
    console.debug(`battleClassic: next button enabled after ${context}`, {
      disabled: btn.disabled,
      attr: btn.getAttribute("data-next-ready"),
      ...extra
    });
  } catch {}
}

function handleStatSelectionError(store, err) {
  console.debug("battleClassic: stat selection handler failed", err);
  let cooldownStarted = false;
  try {
    cooldownStarted = triggerCooldownOnce(store, "statSelectionFailed");
  } catch (cooldownErr) {
    console.debug("battleClassic: triggerCooldownOnce after selection failure failed", cooldownErr);
  }
  try {
    resetCooldownFlag(store);
  } catch {}
  const btn = prepareNextButtonForUse("selection failure");
  if (btn?.dataset) {
    btn.dataset.nextFinalized = NEXT_FINALIZED_STATE.COMPLETE;
  }
  logNextButtonRecovery("selection failure", btn, { cooldownStarted });
}

/**
 * Prepares the UI before stat selection occurs and captures the timestamp of
 * the opponent choosing prompt for minimum duration enforcement.
 *
 * @pseudocode
 * 1. Stop any active stat selection timer utilities.
 * 2. Cancel the global `__battleClassicStopSelectionTimer` hook when available.
 * 3. Show the "opponent choosing" snackbar and record the prompt timestamp.
 * 4. Return any window-provided delay override value.
 *
 * @returns {number} Delay override in milliseconds, or `0` when none provided.
 */
export function prepareUiBeforeSelection() {
  try {
    stopActiveSelectionTimer();
  } catch {}
  clearOpponentPromptFallbackTimer();
  const delayOverride =
    typeof window !== "undefined" && typeof window.__OPPONENT_RESOLVE_DELAY_MS === "number"
      ? Number(window.__OPPONENT_RESOLVE_DELAY_MS)
      : null;
  if (typeof window !== "undefined" && window.__battleClassicStopSelectionTimer) {
    try {
      window.__battleClassicStopSelectionTimer();
    } catch (err) {
      console.debug("battleClassic: cancel selection timer failed", err);
    }
  }
  const flagEnabled = isEnabled("opponentDelayMessage");
  const baseDelay = Number.isFinite(delayOverride)
    ? Number(delayOverride)
    : Number(getOpponentDelay());
  const resolvedDelay = Number.isFinite(baseDelay) && baseDelay > 0 ? baseDelay : 0;

  if (flagEnabled) {
    setOpponentDelay(resolvedDelay);
    if (resolvedDelay > 0) {
      const scheduled = scheduleDelayed(() => {
        try {
          showSnackbar(t("ui.opponentChoosing"));
          recordOpponentPromptTimestamp(getCurrentTimestamp());
        } catch {}
        clearOpponentPromptFallbackTimer();
      }, resolvedDelay);

      if (scheduled && typeof window !== "undefined") {
        // Store the timer ID for future cleanup
        setOpponentPromptFallbackTimerId(resolvedDelay);
      }
      return resolvedDelay;
    }
  }

  try {
    showSnackbar(t("ui.opponentChoosing"));
    recordOpponentPromptTimestamp(getCurrentTimestamp());
  } catch {}
  return 0;
}

function ensureScoreboardReflectsResult(result) {
  try {
    if (result) {
      const rawPlayerScore = Number(result.playerScore);
      const rawOpponentScore = Number(result.opponentScore);
      const normalizedPlayerScore = Number.isFinite(rawPlayerScore) ? rawPlayerScore : 0;
      const normalizedOpponentScore = Number.isFinite(rawOpponentScore) ? rawOpponentScore : 0;

      const normalized = syncScoreboardDisplay(normalizedPlayerScore, normalizedOpponentScore);

      try {
        emitBattleEvent("display.score.update", {
          player: normalized.player,
          opponent: normalized.opponent
        });
      } catch (err) {
        console.debug("battleClassic: failed to emit display.score.update event", err);
      }
    }
  } catch {}
}

async function confirmMatchOutcome(store, result) {
  let snapshot = result && typeof result === "object" ? { ...result } : null;
  let matchEnded = Boolean(snapshot?.matchEnded);
  let engineScores = null;
  try {
    if (!matchEnded && typeof isMatchEnded === "function" && isMatchEnded()) {
      matchEnded = true;
      snapshot = snapshot || {};
    }
    if (typeof getScores === "function") {
      try {
        engineScores = getScores();
      } catch {}
    }
  } catch (err) {
    console.debug("battleClassic: checking match end failed", err);
  }

  if (!matchEnded) {
    return false;
  }

  const scores = {
    player: Number(snapshot?.playerScore ?? engineScores?.playerScore) || 0,
    opponent: Number(snapshot?.opponentScore ?? engineScores?.opponentScore) || 0
  };

  let outcome = typeof snapshot?.outcome === "string" ? snapshot.outcome : "";
  if (!outcome) {
    if (scores.player > scores.opponent) outcome = "matchWinPlayer";
    else if (scores.opponent > scores.player) outcome = "matchWinOpponent";
    else outcome = "matchDraw";
  }

  showEndModal(store, { outcome, scores });
  return true;
}

function scheduleNextReadyAfterSelection(store) {
  const scheduleNextReady = () => {
    const cooldownStarted = triggerCooldownOnce(store, "statSelectionResolved");
    const nextBtn = prepareNextButtonForUse("selection");
    logNextButtonRecovery("selection", nextBtn, { cooldownStarted });
  };
  try {
    setTimeout(scheduleNextReady, computeSelectionReadyDelay());
  } catch (err) {
    console.debug("battleClassic: scheduling next ready failed", err);
    scheduleNextReady();
  }
}

async function applySelectionResult(store, result) {
  try {
    console.debug("battleClassic: stat selection result", {
      matchEnded: Boolean(result?.matchEnded),
      outcome: result?.outcome,
      playerScore: result?.playerScore,
      opponentScore: result?.opponentScore
    });
  } catch {}
  ensureScoreboardReflectsResult(result);
  const matchEnded = await confirmMatchOutcome(store, result);
  if (store && typeof store === "object") {
    let engineRounds = null;
    try {
      const value = getRoundsPlayed();
      if (value !== null && value !== undefined) {
        const numericValue = Number(value);
        engineRounds = Number.isFinite(numericValue) ? numericValue : null;
      }
    } catch (error) {
      engineRounds = null;
      if (
        isDevelopmentEnvironment() &&
        typeof console !== "undefined" &&
        typeof console.debug === "function"
      ) {
        console.debug("battleClassic: Failed to read engine rounds", error);
      }
    }

    // DEBUG: Log getRoundsPlayed result and sync logic
    if (typeof window !== "undefined" && window.__DEBUG_ROUNDS_SYNC) {
      try {
        console.log("[DEBUG] applySelectionResult sync:", {
          getRoundsPlayed: getRoundsPlayed(),
          engineRounds,
          storeRoundsBefore: store.roundsPlayed,
          matchEnded,
          isOrchestrated: isOrchestratorActive(store)
        });
      } catch (e) {
        console.error("[DEBUG] Failed to log sync:", e);
      }
    }

    if (engineRounds === null && !matchEnded && !isOrchestratorActive(store)) {
      const previous = Number(store.roundsPlayed);
      engineRounds = Number.isFinite(previous) ? previous + 1 : 1;
    }

    if (Number.isFinite(engineRounds)) {
      store.roundsPlayed = engineRounds;
      // DEBUG: Log after sync
      if (typeof window !== "undefined" && window.__DEBUG_ROUNDS_SYNC) {
        try {
          console.log("[DEBUG] applySelectionResult synced to:", engineRounds);
        } catch {}
      }
    }
  }
  if (!matchEnded) {
    scheduleNextReadyAfterSelection(store);
  } else {
    try {
      showSnackbar("");
    } catch (err) {
      console.debug("battleClassic: failed to clear snackbar on match end", err);
    }
  }
  return matchEnded;
}

function finalizeSelectionReady(store, options = {}) {
  const { shouldStartCooldown = true } = options;
  const finalizeRoundReady = () => {
    if (shouldStartCooldown) {
      try {
        triggerCooldownOnce(store, "selectionFinalize");
      } catch (err) {
        console.debug("battleClassic: triggerCooldownOnce after selection failed", err);
      }
    } else {
      resetCooldownFlag(store);
    }
    try {
      enableNextRoundButton();
    } catch (err) {
      console.debug("battleClassic: enableNextRoundButton after selection failed", err);
    }
    try {
      const selectionMade = Boolean(store?.selectionMade);
      const shouldExpectRoundAdvance = shouldStartCooldown || selectionMade;
      updateRoundCounterDisplay({
        expectAdvance: shouldExpectRoundAdvance,
        forceWhenEngineMatchesVisible: shouldExpectRoundAdvance
      });
    } catch (err) {
      if (!hasLoggedFinalizeSelectionUpdateFailure) {
        hasLoggedFinalizeSelectionUpdateFailure = true;
        if (isDevelopmentEnvironment()) {
          try {
            if (typeof console !== "undefined" && typeof console.debug === "function") {
              console.debug("battleClassic: updateRoundCounterDisplay after selection failed", err);
            }
          } catch {}
        }
      }
    } finally {
      try {
        const finalizedBtn = getNextRoundButton();
        if (finalizedBtn) {
          try {
            setNextButtonReadyAttributes(finalizedBtn);
          } catch {}
        }
        setNextButtonFinalizedState();
      } catch (contextErr) {
        if (isDevelopmentEnvironment()) {
          try {
            if (typeof console !== "undefined" && typeof console.debug === "function") {
              console.debug("battleClassic: marking next button finalized failed", contextErr);
            }
          } catch {}
        }
      }
    }
  };

  const scheduleFinalization = (delayMs) => {
    try {
      if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
        window.setTimeout(() => finalizeRoundReady(), delayMs);
        return true;
      }
    } catch (err) {
      console.debug("battleClassic: window.setTimeout scheduling failed", err);
    }
    try {
      if (typeof setTimeout === "function") {
        setTimeout(() => finalizeRoundReady(), delayMs);
        return true;
      }
    } catch (err) {
      console.debug("battleClassic: setTimeout scheduling failed", err);
    }
    try {
      if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => finalizeRoundReady());
        return true;
      }
    } catch (err) {
      console.debug("battleClassic: requestAnimationFrame scheduling failed", err);
    }
    return false;
  };

  if (!scheduleFinalization(computeSelectionReadyDelay())) {
    finalizeRoundReady();
  }
}

/**
 * @summary Apply a computed round decision and emit transition broadcasts.
 * @param {ReturnType<typeof createBattleStore>} store - Battle store reference.
 * @param {any} result - Result payload returned from selection or computation helpers.
 * @returns {Promise<{applied: boolean, matchEnded: boolean}>} Application outcome metadata.
 * @pseudocode
 * 1. Exit early when no result payload is provided.
 * 2. Attempt to apply the result via `applySelectionResult()`.
 * 3. On success, broadcast `roundOver` and return `{ applied: true, matchEnded }`.
 * 4. On failure, invoke `handleStatSelectionError()` and return `{ applied: false, matchEnded: false }`.
 */
async function applyRoundDecisionResult(store, result) {
  if (!result) {
    return { applied: false, matchEnded: false };
  }

  try {
    const matchEnded = await applySelectionResult(store, result);
    broadcastBattleState("roundOver");
    return { applied: true, matchEnded: Boolean(matchEnded) };
  } catch (err) {
    handleStatSelectionError(store, err);
    return { applied: false, matchEnded: false };
  }
}

/**
 * Stop the active selection timer and clear the timer display.
 *
 * @pseudocode
 * 1. Stop the active timer if one exists.
 * 2. Clear the timer display element.
 * 3. Reset the stored timer reference.
 */
function stopActiveSelectionTimer() {
  if (activeSelectionTimer) {
    try {
      activeSelectionTimer.stop();
    } catch {}
    activeSelectionTimer = null;
  }
  // Clear the timer display
  try {
    const el = document.getElementById("next-round-timer");
    if (el) el.textContent = "";
  } catch {}
  // Clear the fail-safe timer
  if (failSafeTimerId) {
    clearTimeout(failSafeTimerId);
    failSafeTimerId = null;
  }
}

// Expose the timer cleanup function globally for use by selectionHandler
if (typeof window !== "undefined") {
  window.__battleClassicStopSelectionTimer = stopActiveSelectionTimer;
}

/**
 * Initializes the battle state badge element based on feature flag state
 * and any runtime overrides.
 *
 * @summary Sets the initial visibility and content of the battle state badge.
 *
 * @param {Object} [options={}] - Configuration options.
 * @param {boolean} [options.force=false] - Force badge visibility regardless of current state.
 *
 * @returns {void}
 *
 * @pseudocode
 * 1. Check for a `battleStateBadge` override in `window.__FF_OVERRIDES`.
 * 2. Get a reference to the `#battle-state-badge` element. If not found, exit.
 * 3. If the override is enabled:
 *    a. Set `badge.hidden` to `false` and remove the `hidden` attribute.
 *    b. Set the `badge.textContent` to "Lobby" (unless force=false and text exists).
 * 4. Wrap all DOM operations in a `try...catch` block.
 */
function initBattleStateBadge(options = {}) {
  const { force = true } = options;
  try {
    const overrideEnabled =
      typeof window !== "undefined" &&
      window.__FF_OVERRIDES &&
      window.__FF_OVERRIDES.battleStateBadge;

    const badge = document.getElementById("battle-state-badge");
    if (!badge) return;

    if (overrideEnabled) {
      badge.hidden = false;
      badge.removeAttribute("hidden");
      const txt = String(badge.textContent || "");
      // Keep any explicit round label; otherwise show Lobby
      if (force || !/\bRound\b/i.test(txt)) {
        badge.textContent = "Lobby";
      }
    }
  } catch (err) {
    console.debug("battleClassic: badge setup failed", err);
  }
}

/**
 * Wrapper for updateRoundCounterFromEngine that injects the updateRoundCounter function.
 * This bridges the imported roundTracker module to the local updateRoundCounter DOM function.
 *
 * @param {Object} [options={}] - Configuration options.
 * @param {boolean} [options.expectAdvance=false] - Whether advancement is expected.
 * @param {boolean} [options.forceWhenEngineMatchesVisible=false] - Force advancement when engine matches visible.
 */
function updateRoundCounterDisplay(options = {}) {
  try {
    updateRoundCounterFromEngine({
      ...options,
      updateRoundCounterFn: updateRoundCounter
    });
  } catch (err) {
    safeExecute(
      () => console.debug("battleClassic: updateRoundCounterDisplay failed", err),
      "updateRoundCounterDisplay",
      ERROR_LEVELS.DEBUG
    );
  }
}

async function handleStatButtonClick(store, stat, btn) {
  console.debug("battleClassic: stat button click handler invoked");
  window.__statButtonClickCalled = true; // Track for debugging
  if (!btn || btn.disabled) return;
  const container =
    document.getElementById("stat-buttons") ??
    (btn instanceof HTMLElement ? btn.parentElement : null);
  const buttons = container ? Array.from(container.querySelectorAll("button[data-stat]")) : [];
  const targets = buttons.length > 0 ? buttons : [btn];
  disableStatButtons(targets, container ?? undefined);

  const delayOverride = prepareUiBeforeSelection();
  const { playerVal, opponentVal } = resolveStatValues(store, stat);
  let result;
  try {
    result = await handleStatSelection(store, String(stat), {
      playerVal,
      opponentVal,
      delayMs: delayOverride
    });
  } catch (err) {
    handleStatSelectionError(store, err);
    finalizeSelectionReady(store, { shouldStartCooldown: false });
    return;
  }

  // Disable stat buttons after selection to prevent multiple clicks
  if (buttons.length === 0 && container) {
    const fallbackButtons = Array.from(container.querySelectorAll("button[data-stat]"));
    if (fallbackButtons.length > 0) {
      disableStatButtons(fallbackButtons, container);
    }
  }

  if (result) {
    broadcastBattleState("roundDecision");
  }

  const { applied, matchEnded } = await applyRoundDecisionResult(store, result);
  finalizeSelectionReady(store, { shouldStartCooldown: applied && !matchEnded });
}

/**
 * Render stat buttons and bind click handlers to resolve the round.
 *
 * @pseudocode
 * 1. Create buttons for STATS, enable them, and handle selection.
 */
function renderStatButtons(store) {
  const container = document.getElementById("stat-buttons");
  if (!container) {
    return;
  }

  // Safety check: ensure STATS is defined and iterable
  if (!Array.isArray(STATS)) {
    console.error("battleClassic: STATS is not an array", STATS);
    return;
  }

  const listenerRegistry = (() => {
    try {
      if (typeof window === "undefined" || (!window.__TEST__ && !window.__PLAYWRIGHT_TEST__)) {
        return null;
      }
      if (window.__classicBattleStatButtonListeners) {
        const existing = window.__classicBattleStatButtonListeners;
        existing.attachedCount = 0;
        existing.stats = [];
        existing.details = [];
        existing.buttonCount = Array.isArray(STATS) ? STATS.length : 0;
        existing.updatedAt = Date.now();
        return existing;
      }
      const registry = {
        attachedCount: 0,
        stats: [],
        details: [],
        buttonCount: Array.isArray(STATS) ? STATS.length : 0,
        updatedAt: Date.now()
      };
      window.__classicBattleStatButtonListeners = registry;
      return registry;
    } catch {
      return null;
    }
  })();
  const recordStatButtonListenerAttachment = (button, stat) => {
    if (!listenerRegistry) {
      return;
    }
    try {
      listenerRegistry.attachedCount += 1;
      listenerRegistry.stats.push(String(stat));
      listenerRegistry.details.push({
        stat: String(stat),
        datasetStat: typeof button?.dataset?.stat === "string" ? button.dataset.stat : null,
        label: typeof button?.textContent === "string" ? button.textContent.trim() : null
      });
      listenerRegistry.updatedAt = Date.now();
    } catch {}
  };
  resetCooldownFlag(store);
  try {
    disableNextRoundButton();
  } catch (err) {
    console.debug("battleClassic: disableNextRoundButton before selection failed", err);
  }
  try {
    if (typeof detachStatHotkeys === "function") {
      detachStatHotkeys();
    }
  } catch {}
  detachStatHotkeys = undefined;
  container.innerHTML = "";
  for (const stat of STATS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = String(stat);
    btn.classList.add("stat-button");
    btn.setAttribute("data-stat", String(stat));
    btn.setAttribute("data-player", "0");
    btn.setAttribute("data-testid", "stat-button");
    // Accessibility: label and description per stat
    const descId = `stat-${String(stat)}-desc`;
    btn.setAttribute("aria-describedby", descId);
    btn.setAttribute("aria-label", `Select ${stat} stat for battle`);
    let desc;
    try {
      desc = document.getElementById(descId);
      if (!desc) {
        desc = document.createElement("span");
      }
      desc.id = descId;
      desc.className = "sr-only";
      desc.textContent = `${String(stat)} — select to compare this attribute`;
    } catch {
      desc = undefined;
    }
    btn.addEventListener("click", () => {
      void handleStatButtonClick(store, stat, btn);
    });
    recordStatButtonListenerAttachment(btn, stat);
    container.appendChild(btn);
    if (desc) {
      container.appendChild(desc);
    }
  }
  requestAnimationFrame(() => {
    container.dataset.buttonsReady = "true";
  });
  try {
    const buttons = container.querySelectorAll("button[data-stat]");
    setStatButtonsEnabled(
      buttons,
      container,
      true,
      () => resolveStatButtonsReady(),
      () => {}
    );
    try {
      detachStatHotkeys = wireStatHotkeys(Array.from(buttons));
    } catch {}
  } catch {} // Ignore errors if setting stat buttons enabled fails
}

/**
 * Start the round selection timer and enter cooldown on expiration.
 *
 * @pseudocode
 * 1. In Vitest use `createCountdownTimer`; otherwise `startTimer` and compute outcome.
 */
async function beginSelectionTimer(store) {
  const IS_VITEST = typeof process !== "undefined" && process.env && process.env.VITEST === "true";
  if (IS_VITEST) {
    const dur = Number(getDefaultTimer("roundTimer")) || 2;
    const timer = createCountdownTimer(dur, {
      onTick: (remaining) => {
        try {
          const clamped = remaining > 0 ? `${remaining}s` : "";
          updateTimerFallback(clamped);
        } catch (err) {
          console.debug("battleClassic: onTick DOM update failed", err);
        }
      },
      onExpired: async () => {
        try {
          document.body.dataset.autoSelected = document.body.dataset.autoSelected || "auto";
        } catch (err) {
          console.debug("battleClassic: set autoSelected failed", err);
        }
        let result;
        try {
          const { playerVal, opponentVal } = resolveStatValues(store, "speed");
          result = await computeRoundResult(store, "speed", playerVal, opponentVal);
        } catch (err) {
          console.debug("battleClassic: computeRoundResult (vitest) failed", err);
        }
        try {
          if (result) {
            syncScoreboardDisplay(
              Number(result.playerScore) || 0,
              Number(result.opponentScore) || 0
            );
          }
        } catch {}
        if (result) {
          broadcastBattleState("roundDecision");
        }
        const { matchEnded } = await applyRoundDecisionResult(store, result);
        if (!matchEnded) {
          triggerCooldownOnce(store, "vitestTimerExpired");
        } else {
          try {
            showSnackbar("");
          } catch {}
        }
      },
      pauseOnHidden: false
    });
    // Store the timer so it can be stopped when stat selection occurs
    activeSelectionTimer = timer;
    timer.start();
    return;
  }
  activeSelectionTimer = await startTimer(async (stat) => {
    if (failSafeTimerId) {
      clearTimeout(failSafeTimerId);
      failSafeTimerId = null;
    }
    try {
      document.body.dataset.autoSelected = String(stat || "auto");
    } catch (err) {
      console.debug("battleClassic: set autoSelected (timer) failed", err);
    }
    try {
      const { playerVal, opponentVal } = resolveStatValues(store, String(stat || "speed"));
      const result = await computeRoundResult(
        store,
        String(stat || "speed"),
        playerVal,
        opponentVal
      );
      // Defensive direct DOM update to satisfy E2E in case adapter binding fails
      try {
        if (result) {
          syncScoreboardDisplay(Number(result.playerScore) || 0, Number(result.opponentScore) || 0);
        }
      } catch {}
      if (result) {
        broadcastBattleState("roundDecision");
      }
      const { matchEnded } = await applyRoundDecisionResult(store, result);
      if (!matchEnded) {
        const manualTrigger = triggerCooldownOnce(store, "selectionTimerAutoResolve");
        if (manualTrigger) {
          // If something interferes with the cooldown wiring, ensure Next is usable
          try {
            enableNextRoundButton();
          } catch {}
        }
      } else {
        try {
          showSnackbar("");
        } catch {}
      }
    } catch (err) {
      console.debug("battleClassic: computeRoundResult (timer) failed", err);
    }
    return Promise.resolve();
  }, store);
  // Fail-safe: if for any reason the expiration callback path is interrupted,
  // ensure the round resolves and Next becomes ready shortly after the expected
  // duration. This keeps E2E deterministic even when optional adapters are missing.
  try {
    const ms = (Number(getDefaultTimer("roundTimer")) || 2) * 1000 + 100;
    failSafeTimerId = setTimeout(async () => {
      failSafeTimerId = null;
      try {
        const btn = document.getElementById("next-button");
        const scoreEl = document.getElementById("score-display");
        const playerValue = scoreEl
          ?.querySelector('[data-side="player"] [data-part="value"]')
          ?.textContent?.trim();
        const opponentValue = scoreEl
          ?.querySelector('[data-side="opponent"] [data-part="value"]')
          ?.textContent?.trim();
        const needsScore =
          scoreEl && playerValue !== undefined && opponentValue !== undefined
            ? playerValue === "0" && opponentValue === "0"
            : scoreEl && /You:\s*0\s*Opponent:\s*0/.test(scoreEl?.textContent || "");
        const notReady = btn && (btn.disabled || btn.getAttribute("data-next-ready") !== "true");
        if (needsScore || notReady) {
          const { playerVal, opponentVal } = resolveStatValues(store, "speed");
          const result = await computeRoundResult(store, "speed", playerVal, opponentVal);
          try {
            if (result) {
              syncScoreboardDisplay(
                Number(result.playerScore) || 0,
                Number(result.opponentScore) || 0
              );
            }
          } catch {}
          if (result) {
            broadcastBattleState("roundDecision");
          }
          const { matchEnded } = await applyRoundDecisionResult(store, result);
          if (!matchEnded) {
            const fallbackTriggered = triggerCooldownOnce(store, "selectionFailSafe");
            if (fallbackTriggered) {
              try {
                enableNextRoundButton();
              } catch {}
            }
          } else {
            try {
              showSnackbar("");
            } catch {}
          }
        }
      } catch {}
    }, ms);
  } catch {}
}

/**
 * Handle replay button click to restart the match.
 *
 * @pseudocode
 * 1. Reset the battle engine.
 * 2. Clear any existing state.
 * 3. Restart the match.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @returns {Promise<void>}
 */
/**
 * Start a round cycle: update counter, draw UI, run timer.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle store managing round lifecycle state.
 * @param {{ skipStartRound?: boolean }} [options] - Optional configuration flags for the round start.
 *
 * @pseudocode
 * 1. Update round counter.
 * 2. Render selection UI.
 * 3. Begin selection timer.
 */
async function startRoundCycle(store, options = {}) {
  const { skipStartRound = false } = options;
  if (isStartingRoundCycle) return;
  isStartingRoundCycle = true;
  try {
    try {
      stopActiveSelectionTimer();
    } catch {}

    let roundStarted = false;
    if (skipStartRound) {
      roundStarted = true;
    } else {
      try {
        await startRound(store);
        roundStarted = true;
      } catch (err) {
        console.error("battleClassic: startRound failed", err);
        // Re-throw JudokaDataLoadError to trigger proper cleanup in outer handler
        if (err instanceof JudokaDataLoadError) {
          throw err;
        }
        // For other errors when showing fallback retry UI, we need to signal the error
        // so the fallback handler can re-show the button. Check if we're in fallback mode.
        if (store && store.__roundSelectFallbackShown) {
          throw new Error(`startRound failed in fallback mode: ${err.message}`);
        }
        // Don't re-throw other errors - continue with the cycle even if startRound fails
        // This allows the battle state machine to proceed
      }
    }

    // Clear fallback UI only after successful round start
    // If startRound failed, the fallback will be re-shown by the click handler's catch block
    if (roundStarted) {
      clearRoundSelectFallback(store);
      broadcastBattleState("roundStart");
    }

    updateRoundCounterDisplay({ expectAdvance: true });

    try {
      renderStatButtons(store);
    } catch (err) {
      console.error("battleClassic: renderStatButtons failed", err);
      // Log the error but continue - don't prevent state transition
    }
    try {
      showSelectionPrompt();
    } catch (err) {
      console.debug("battleClassic: showSelectionPrompt failed", err);
    }
    try {
      await beginSelectionTimer(store);
    } catch {}

    broadcastBattleState("waitingForPlayerAction");
  } catch (err) {
    console.error("battleClassic: startRoundCycle outer catch:", err);
    // Re-throw JudokaDataLoadError or fallback mode errors so they can be handled by callers
    if (err instanceof JudokaDataLoadError || (store && store.__roundSelectFallbackShown)) {
      throw err;
    }
  } finally {
    isStartingRoundCycle = false;
  }
}

/**
 * Remove the round select fallback UI and reset its tracking flag.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle store object that tracks fallback state.
 *
 * @pseudocode
 * 1. Remove fallback message and button elements when present.
 * 2. Reset the store tracking flag so the fallback can be re-rendered later.
 */
function clearRoundSelectFallback(store) {
  if (typeof document === "undefined") {
    if (store && typeof store === "object") {
      store.__roundSelectFallbackShown = false;
    }
    return;
  }
  const fallbackBtn = document.getElementById("round-select-fallback");
  if (fallbackBtn) {
    fallbackBtn.remove();
  }
  const fallbackMsg = document.getElementById("round-select-error");
  if (fallbackMsg) {
    fallbackMsg.remove();
  }
  if (store && typeof store === "object") {
    store.__roundSelectFallbackShown = false;
  }
}

/**
 * Display a fallback start button when the round select modal fails.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle store tracking fallback render state.
 *
 * @pseudocode
 * 1. Render error message and start button.
 * 2. Clicking the button starts the round cycle.
 */
function showRoundSelectFallback(store) {
  const fallbackInDom = Boolean(document.getElementById("round-select-fallback"));
  const fallbackTracked = Boolean(store && store.__roundSelectFallbackShown);

  if (!fallbackInDom && fallbackTracked && store) {
    store.__roundSelectFallbackShown = false;
    delete store.__roundSelectFallbackRetryCount;
  }

  if ((store && store.__roundSelectFallbackShown) || fallbackInDom) {
    return;
  }

  if (store) {
    store.__roundSelectFallbackShown = true;
    if (typeof store.__roundSelectFallbackRetryCount !== "number") {
      store.__roundSelectFallbackRetryCount = 0;
    }
  }

  const msg = document.createElement("p");
  msg.id = "round-select-error";
  msg.textContent = "Round selection failed. Start match?";

  const btn = document.createElement("button");
  btn.id = "round-select-fallback";
  btn.type = "button";
  btn.textContent = "Start Match";
  btn.addEventListener("click", async () => {
    try {
      await startRoundCycle(store);
      if (store && typeof store === "object") {
        delete store.__roundSelectFallbackRetryCount;
      }
    } catch (err) {
      console.warn("battleClassic: fallback start failed", err);
      if (store && typeof store === "object") {
        const retries = Number(store.__roundSelectFallbackRetryCount) || 0;
        if (retries < 3) {
          store.__roundSelectFallbackRetryCount = retries + 1;
          showRoundSelectFallback(store);
          return;
        }
        console.error("battleClassic: fallback retry limit exceeded", err);
      }
      try {
        clearRoundSelectFallback(store);
        showFatalInitError(err);
      } catch (fatalError) {
        console.error("battleClassic: fatal error display failed", fatalError);
      }
    }
  });

  document.body.append(msg, btn);
}

/**
 * Set up scoreboard and initial UI state.
 * @pseudocode
 * 1. Initialize scoreboard with no-op timer controls.
 * 2. Ensure opponent card visibility.
 * 3. Initialize scoreboard adapter.
 * 4. Seed visible defaults for score and round counter.
 */
function setupInitialUI() {
  setupScoreboard({ pauseTimer() {}, resumeTimer() {}, startCooldown() {} });

  const opponentCard = document.getElementById("opponent-card");
  if (opponentCard) {
    opponentCard.classList.remove("opponent-hidden");
    opponentCard.classList.add("is-obscured");
  }

  initScoreboardAdapter();
  updateScore(0, 0);

  const sd = document.getElementById("score-display");
  if (sd) {
    const hasExcessWhitespace = /\n\s{2,}/.test(sd.innerHTML);
    if (hasExcessWhitespace) {
      sd.innerHTML = `<span data-side="player"><span data-part="label">You:</span> <span data-part="value">0</span></span>\n<span data-side="opponent"><span data-part="label">Opponent:</span> <span data-part="value">0</span></span>`;
    }
  }

  updateRoundCounter(0);
  const rc = document.getElementById("round-counter");
  if (rc && !rc.textContent) rc.textContent = "Round 0";
}

/**
 * Wire event listeners for cooldown transitions.
 * @param {Object} store - Battle store.
 */
function wireCooldownEvents(store) {
  const markFromEvent = () => {
    markCooldownStarted(store);
  };
  onBattleEvent("nextRoundCountdownStarted", markFromEvent);
  onBattleEvent("control.countdown.started", markFromEvent);
  onBattleEvent("countdownStart", markFromEvent);
}

/**
 * Wire global event listeners for round cycles and match events.
 * @param {Object} store - Battle store.
 */
function wireGlobalBattleEvents(store) {
  onBattleEvent("roundResolved", (e) => {
    try {
      const result = e?.detail?.result;
      if (!result || !result.matchEnded) return;
      const outcome = String(result?.outcome || "");
      const scores = {
        player: Number(result?.playerScore) || 0,
        opponent: Number(result?.opponentScore) || 0
      };
      showEndModal(store, { outcome, scores });
    } catch {}
  });

  onEngine?.("matchEnded", (detail) => {
    try {
      const outcome = String(detail?.outcome || "");
      if (outcome === "quit") return;
      const scores = {
        player: Number(detail?.playerScore) || 0,
        opponent: Number(detail?.opponentScore) || 0
      };
      showEndModal(store, { outcome, scores });
    } catch {}
  });
}

/**
 * Wire UI control buttons (next, replay, quit, home).
 * @param {Object} store - Battle store.
 */
function wireControlButtons(store) {
  const nextBtn = document.getElementById("next-button");
  if (nextBtn) nextBtn.addEventListener("click", onNextButtonClick);

  const replayBtn = document.getElementById("replay-button");
  if (replayBtn) {
    replayBtn.addEventListener("click", async () => {
      stopActiveSelectionTimer();
      isStartingRoundCycle = false;
      resetOpponentPromptTimestamp();
      resetRoundCounterTracking();

      if (store.statTimeoutId) {
        clearTimeout(store.statTimeoutId);
        store.statTimeoutId = null;
      }
      if (store.autoSelectId) {
        clearTimeout(store.autoSelectId);
        store.autoSelectId = null;
      }

      await handleReplay(store);
      await waitForStatButtonsReady();
      updateScore(0, 0);
      updateRoundCounter(1);
      resetFallbackScores();
    });
  }

  const quitBtn = document.getElementById("quit-button");
  if (quitBtn) quitBtn.addEventListener("click", () => quitMatch(store, quitBtn));

  bindHomeButton(store);
}

/**
 * Handle round start event with deduplication.
 * @param {Object} store - Battle store.
 * @param {Event} evt - Event object.
 */
async function handleRoundStartEvent(store, evt) {
  const eventType = typeof evt === "string" ? evt : evt?.type;
  const eventDetail =
    evt && typeof evt === "object" && "detail" in evt ? evt.detail : undefined;
  const manualRoundStart =
    eventType === "round.start" &&
    eventDetail &&
    typeof eventDetail === "object" &&
    eventDetail?.source === "next-button";

  if (manualRoundStart) {
    lastManualRoundStartTimestamp = getCurrentTimestamp();
    if (typeof window !== "undefined") {
      try {
        window.__lastManualRoundStartTimestamp = lastManualRoundStartTimestamp;
      } catch {}
    }
  }

  if (eventType === "ready") {
    queueMicrotask(async () => {
      const now = getCurrentTimestamp();
      const hasManualStamp = lastManualRoundStartTimestamp > 0;
      const elapsedSinceManual = hasManualStamp
        ? now - lastManualRoundStartTimestamp
        : Number.POSITIVE_INFINITY;
      const skipDueToManual =
        hasManualStamp &&
        elapsedSinceManual >= 0 &&
        elapsedSinceManual < READY_SUPPRESSION_WINDOW_MS;
      if (skipDueToManual) {
        return;
      }
      try {
        await startRoundCycle(store);
        recordRoundCycleTrigger(eventType || "unknown");
      } catch (err) {
        console.error("battleClassic: startRoundCycle ready handler failed", err);
        if (err instanceof JudokaDataLoadError) {
          recordJudokaLoadFailureTelemetry("event.ready.startRoundCycle");
        } else {
          showFatalInitError(err);
        }
      }
    });
  } else {
    try {
      await startRoundCycle(store);
      recordRoundCycleTrigger(eventType || "unknown");
    } catch (err) {
      console.error("battleClassic: startRoundCycle round.start handler failed", err);
      if (err instanceof JudokaDataLoadError) {
        recordJudokaLoadFailureTelemetry("event.round.start.startRoundCycle");
      } else {
        showFatalInitError(err);
      }
    }
  }

  if (typeof isMatchEnded === "function" && isMatchEnded()) return;
}

/**
 * Wire round cycle events (ready, round.start, roundStarted).
 * @param {Object} store - Battle store.
 */
function wireRoundCycleEvents(store) {
  onBattleEvent("round.start", (evt) => handleRoundStartEvent(store, evt));
  onBattleEvent("ready", (evt) => handleRoundStartEvent(store, evt));
  onBattleEvent("roundStarted", async () => {
    if (isStartingRoundCycle) return;
    try {
      await startRoundCycle(store, { skipStartRound: true });
    } catch (err) {
      console.error("battleClassic: startRoundCycle roundStarted handler failed", err);
      if (err instanceof JudokaDataLoadError) {
        recordJudokaLoadFailureTelemetry("event.roundStarted.startRoundCycle");
      } else {
        showFatalInitError(err);
      }
    }
  });
}

/**
 * Handle card retry and error exit events.
 * @param {Object} store - Battle store.
 */
function wireCardEventHandlers(store) {
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    if (window.__classicBattleRetryListener) {
      window.removeEventListener(CARD_RETRY_EVENT, window.__classicBattleRetryListener);
    }
    const retryListener = async () => {
      try {
        await startRoundCycle(store);
      } catch (err) {
        console.error("battleClassic: startRoundCycle retry failed", err);
        showFatalInitError(err);
      }
    };
    window.__classicBattleRetryListener = retryListener;
    window.addEventListener(CARD_RETRY_EVENT, retryListener);

    if (window.__classicBattleExitListener) {
      window.removeEventListener(LOAD_ERROR_EXIT_EVENT, window.__classicBattleExitListener);
    }
    const exitListener = () => {
      try {
        stopActiveSelectionTimer();
      } catch {}
      setHeaderNavigationLocked(false);
      try {
        document.body.removeAttribute("data-battle-active");
      } catch {}
      setBadgeText("Lobby");
      try {
        showSnackbar("");
      } catch {}
      try {
        if (!document.getElementById("round-select-error")) {
          showRoundSelectFallback(store);
        }
      } catch {}
    };
    window.__classicBattleExitListener = exitListener;
    window.addEventListener(LOAD_ERROR_EXIT_EVENT, exitListener);
  }
}

/**
 * Initialize round select modal and handle match start.
 * @param {Object} store - Battle store.
 */
async function initializeMatchStart(store) {
  try {
    await initRoundSelectModal(async () => {
      try {
        if (typeof process !== "undefined" && process.env && process.env.VITEST) {
          console.debug(
            `[test] battleClassic.init onStart set body.dataset.target=${document.body.dataset.target}`
          );
        }
      } catch {}
      setBadgeText("Round");
      document.body.setAttribute("data-battle-active", "true");
      setHeaderNavigationLocked(true);
      broadcastBattleState("matchStart");
      try {
        await startRoundCycle(store);
      } catch (err) {
        console.error("battleClassic: startRoundCycle failed", err);
        setHeaderNavigationLocked(false);
        try {
          document.body.removeAttribute("data-battle-active");
        } catch {}
        setBadgeText("Lobby");
        if (err instanceof JudokaDataLoadError) {
          recordJudokaLoadFailureTelemetry("initRoundSelectModal.startRoundCycle");
          return;
        }
        showFatalInitError(err);
        return;
      }
    });
  } catch (err) {
    console.error("battleClassic: initRoundSelectModal failed", err);
    if (err instanceof JudokaDataLoadError) {
      recordJudokaLoadFailureTelemetry("initRoundSelectModal.bootstrap");
    }
    try {
      showRoundSelectFallback(store);
    } catch (fallbackError) {
      console.error("battleClassic: showRoundSelectFallback failed", fallbackError);
      try {
        showFatalInitError(fallbackError);
      } catch (fatalError) {
        console.error("battleClassic: fatal error display failed", fatalError);
      }
      throw fallbackError;
    }
  }
}

/**
 * Initializes the battle state badge element based on feature flag state
 * and any runtime overrides.
 *
 * @summary Sets the initial visibility and content of the battle state badge.
 *
 * @returns {Promise<void>} A promise that resolves when the Classic Battle page
 * is fully initialized.
 *
 * @pseudocode
 * 1. Mark `window.__initCalled` as true for debugging purposes.
 * 2. Expose the test API using `exposeTestAPI()`.
 * 3. Initialize the battle state badge synchronously using `initBattleStateBadge()`.
 * 4. Initialize feature flags asynchronously using `initFeatureFlags()`.
 * 5. Set up the shared scoreboard component with no-op timer controls using `setupScoreboard()`.
 * 6. Initialize the scoreboard adapter using `initScoreboardAdapter()`.
 * 7. Seed visible UI defaults for score and round counter, and ensure the round counter element is present.
 * 8. Create the battle engine using `createBattleEngine()`.
 * 9. Bridge engine events to UI handlers using `bridgeEngineEvents()`.
 * 10. Create the battle store using `createBattleStore()` and expose it globally as `window.battleStore`.
 * 11. Bind transient UI helper event handlers using `bindUIHelperEventHandlersDynamic()`.
 * 12. Initialize the debug panel using `initDebugPanel()`.
 * 13. Wire control buttons (next, replay, quit, home).
 * 14. Wire cooldown, battle, and round cycle events.
 * 15. Wire card retry and exit event handlers.
 * 16. Initialize the round select modal and handle match start.
 */
async function init() {
  try {
    removeBackdrops();
    setupScheduler();

    if (typeof window !== "undefined") {
      window.__initCalled = true;
    }

    exposeTestAPI();
    try {
      window.__TEST_API?.inspect?.resetCache?.();
    } catch (err) {
      console.debug("battleClassic: test cache reset failed", err);
    }

    initBattleStateBadge();
    initBattleStateBadge({ force: false });

    await initFeatureFlags();
    initBattleStateBadge({ force: false });
    initDebugFlagHud();

    setupInitialUI();

    createBattleEngine(window.__ENGINE_CONFIG || {});
    bridgeEngineEvents();

    const store = createBattleStore();
    if (typeof window !== "undefined") {
      window.battleStore = store;
    }

    wireCardEventHandlers(store);
    wireCooldownEvents(store);
    bindUIHelperEventHandlersDynamic();
    wireGlobalBattleEvents(store);
    initDebugPanel();
    initBattleStateBadge({ force: false });

    wireControlButtons(store);
    await initializeMatchStart(store);

    wireRoundCycleEvents(store);

    if (typeof window !== "undefined") {
      window.__battleInitComplete = true;
    }
  } catch (err) {
    console.error("battleClassic: bootstrap failed", err);
    showFatalInitError(err);
  }
}

// Simple synchronous badge initialization
function initBadgeSync() {
  initBattleStateBadge({ force: true });
}

/**
 * Update badge text to indicate round state (non-destructive if not override).
 *
 * @param {string} text - Text to set on badge (e.g., "Round").
 */
function setBadgeText(text) {
  try {
    const w = typeof window !== "undefined" ? window : null;
    const overrides = w && w.__FF_OVERRIDES;
    if (!overrides || !overrides.battleStateBadge) return;
    const badge = document.getElementById("battle-state-badge");
    if (!badge) return;
    badge.hidden = false;
    badge.removeAttribute("hidden");
    badge.textContent = String(text || "Lobby");
  } catch {}
}

// Only initialize automatically in browser context; in test/Node environments,
// tests must explicitly call init() and manage setup. Guard against document
// being undefined at module load time (e.g., in certain test configurations).
if (typeof document !== "undefined" && document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initBadgeSync();
    init().catch((err) => {
      console.error("battleClassic: init failed", err);
      showFatalInitError(err);
    });
  });
} else if (typeof document !== "undefined") {
  initBadgeSync();
  init().catch((err) => {
    console.error("battleClassic: init failed", err);
    showFatalInitError(err);
  });
}

/**
 * Re-export initialization helpers for the Classic Battle page.
 *
 * @summary Provides named exports for `init` and `initBattleStateBadge` so
 * tests and bootstrappers can import them from this module.
 *
 * @pseudocode
 * 1. Expose `init` which bootstraps the page and UI.
 * 2. Expose `initBattleStateBadge` which sets initial badge visibility/content.
 *
 * @returns {void}
 */
export { init, initBattleStateBadge, renderStatButtons };
