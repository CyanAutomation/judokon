import { createCountdownTimer, getDefaultTimer } from "../helpers/timerUtils.js";
import {
  createBattleStore,
  startCooldown,
  startRound,
  handleReplay
} from "../helpers/classicBattle/roundManager.js";
import { computeRoundResult } from "../helpers/classicBattle/roundResolver.js";
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
  getScores,
  getPointsToWin
} from "../helpers/battleEngineFacade.js";
import { initRoundSelectModal } from "../helpers/classicBattle/roundSelectModal.js";
import { startTimer, onNextButtonClick } from "../helpers/classicBattle/timerService.js";
import { emitBattleEvent, onBattleEvent } from "../helpers/classicBattle/battleEvents.js";
import { initScoreboardAdapter } from "../helpers/classicBattle/scoreboardAdapter.js";
import { bridgeEngineEvents } from "../helpers/classicBattle/engineBridge.js";
import { initFeatureFlags, isEnabled } from "../helpers/featureFlags.js";
import { exposeTestAPI } from "../helpers/testApi.js";
import { setTestMode } from "../helpers/testModeUtils.js";
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
  getStatButtonsContainer,
  getStatButtons,
  getNextButton,
  getScoreDisplay,
  getPlayerScoreValue,
  getOpponentScoreValue,
  getNextRoundTimer,
  getTimerParts,
  getHomeButton,
  getHeaderLinks,
  getRoundSelectFallback,
  getRoundSelectError,
  hasRoundSelectFallback,
  getOpponentCard,
  getRoundCounter,
  getReplayButton,
  getQuitButton
} from "../helpers/classicBattle/UIElements.js";
import {
  getCurrentTimestamp,
  scheduleDelayed,
  clearScheduled
} from "../helpers/classicBattle/timerSchedule.js";
import { initClassicBattleOrchestrator } from "../helpers/classicBattle/orchestrator.js";
import { setBattleStateSnapshot } from "../helpers/classicBattle/eventBus.js";
import { getDocumentRef } from "../helpers/documentHelper.js";
import { t } from "../helpers/i18n.js";
import {
  showSelectionPrompt,
  getOpponentDelay,
  setOpponentDelay
} from "../helpers/classicBattle/snackbar.js";
import {
  initBattleStateBadge,
  setBadgeText,
  initBadgeSync
} from "../helpers/classicBattle/badgeManager.js";
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

// =============================================================================
// Configuration & Constants
// =============================================================================

const CONFIG = Object.freeze({
  POST_SELECTION_READY_DELAY_MS: 48,
  OPPONENT_MESSAGE_BUFFER_MS: 150,
  READY_SUPPRESSION_WINDOW_MS:
    typeof window !== "undefined"
      ? typeof window.__READY_SUPPRESSION_WINDOW_MS === "number"
        ? window.__READY_SUPPRESSION_WINDOW_MS
        : 200
      : 200,
  COOLDOWN_FLAG: "__uiCooldownStarted",
  NEXT_FINALIZED_STATE: Object.freeze({
    PENDING: "pending",
    COMPLETE: "true"
  })
});

const BASE_SELECTION_READY_DELAY_MS = Math.max(
  CONFIG.POST_SELECTION_READY_DELAY_MS,
  CONFIG.OPPONENT_MESSAGE_BUFFER_MS
);

// =============================================================================
// Global State Management
// =============================================================================

const STATE = {
  activeSelectionTimer: null,
  failSafeTimerId: null,
  isStartingRoundCycle: false,
  detachStatHotkeys: undefined,
  hasLoggedFinalizeSelectionUpdateFailure: false,
  lastManualRoundStartTimestamp: 0
};

// =============================================================================
// Timer & UI Utilities
// =============================================================================

function updateTimerFallback(value) {
  try {
    const doc = getDocumentRef();
    if (!doc) return;
    const el = getNextRoundTimer(doc);
    if (!el) return;
    const { value: valueSpan, label: labelSpan } = getTimerParts(el);
    if (valueSpan) {
      const hasValue = typeof value === "string" && value.length > 0;
      valueSpan.textContent = value;
      if (labelSpan) {
        labelSpan.textContent = hasValue ? "Time Left:" : "";
      }
      const separator = labelSpan?.nextSibling;
      if (hasValue) {
        if (!separator || separator.nodeType !== 3) {
          const refDoc = el.ownerDocument || doc;
          el.insertBefore(refDoc.createTextNode(" "), valueSpan);
        } else if (!/\s/.test(separator.textContent || "")) {
          separator.textContent = " ";
        }
      } else if (separator && separator.nodeType === 3) {
        el.removeChild(separator);
      }
    } else {
      el.textContent = value ? `Time Left: ${value}` : "";
    }
  } catch (err) {
    safeExecute(
      () => console.debug("battleClassic: updateTimerFallback failed", err),
      "updateTimerFallback",
      ERROR_LEVELS.SILENT
    );
  }
}

/**
 * Broadcast the current battle state to listeners and document metadata.
 *
 * @pseudocode
 * 1. Read the previous battle state from the document body dataset if available.
 * 2. Create a detail payload with `from` and `to` states and store a snapshot.
 * 3. Emit the `battleStateChange` event and mirror the new state onto the body dataset.
 *
 * @param {string|null|undefined} state
 * @returns {void}
 */
export function broadcastBattleState(state) {
  let from = null;
  try {
    const doc = getDocumentRef();
    if (doc && typeof doc !== "undefined") {
      from = doc.body?.dataset?.battleState ?? null;
    }
  } catch {}
  const detail = { from, to: state };
  try {
    setBattleStateSnapshot(state);
    const w = typeof window !== "undefined" ? window : undefined;
    if (w) {
      w.__LAST_BATTLE_STATE_DETAIL = detail;
    }
  } catch {}
  emitBattleEvent("battleStateChange", detail);
  try {
    const doc = getDocumentRef();
    if (doc && typeof doc !== "undefined") {
      doc.body.dataset.battleState = state;
    }
  } catch (e) {
    safeExecute(
      () => console.debug(`Failed to set battleState on body`, e),
      "broadcastBattleState",
      ERROR_LEVELS.SILENT
    );
  }
}

function setHeaderNavigationLocked(locked) {
  if (typeof document === "undefined") {
    return;
  }
  try {
    const headerLinks = getHeaderLinks();
    headerLinks.forEach((link) => {
      link.style.pointerEvents = locked ? "none" : "";
    });
  } catch {}
}

function bindHomeButton(store) {
  try {
    const homeBtn = getHomeButton();
    if (!homeBtn) return;
    if (!homeBtn.__boundQuit) {
      homeBtn.addEventListener("click", () => {
        try {
          const activeStore =
            store && typeof store === "object"
              ? store
              : typeof window !== "undefined" && window.battleStore
                ? window.battleStore
                : {};
          quitMatch(activeStore, homeBtn);
        } catch {}
      });
      homeBtn.__boundQuit = true;
    }
  } catch {}
}

// =============================================================================
// Timing & Delay Calculations
// =============================================================================

function calculateRemainingOpponentMessageTime() {
  try {
    const now = getCurrentTimestamp();
    const lastPrompt = getOpponentPromptTimestamp() || 0;
    const elapsed = now - lastPrompt;
    return Math.max(0, getOpponentPromptMinDuration() - elapsed);
  } catch {}
  return 0;
}

function computeSelectionReadyDelay() {
  let delayForReady = BASE_SELECTION_READY_DELAY_MS;
  try {
    const opponentDelay = getOpponentDelay?.();
    if (Number.isFinite(opponentDelay) && opponentDelay >= 0) {
      delayForReady = Math.max(delayForReady, opponentDelay + CONFIG.OPPONENT_MESSAGE_BUFFER_MS);
    }
  } catch {}
  return Math.max(delayForReady, getOpponentPromptMinDuration());
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
          console.debug("battleClassic: failed to persist lastRoundCycleTrigger", {
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

// =============================================================================
// Cooldown State Management
// =============================================================================

function resetCooldownFlag(store) {
  if (!store || typeof store !== "object") return;
  try {
    store[CONFIG.COOLDOWN_FLAG] = false;
  } catch {}
}

function markCooldownStarted(store) {
  if (!store || typeof store !== "object") return false;
  if (store[CONFIG.COOLDOWN_FLAG]) return false;
  try {
    store[CONFIG.COOLDOWN_FLAG] = true;
  } catch {
    return false;
  }
  return true;
}

function handleCooldownError(reason, err) {
  safeExecute(
    () => {
      console.debug("battleClassic: startCooldown manual trigger failed", {
        reason: reason || "unknown",
        error: err
      });
    },
    `handleCooldownError (${reason})`,
    ERROR_LEVELS.DEBUG
  );
}

function invokeStartCooldown(store, reason) {
  try {
    startCooldown(store);
    return true;
  } catch (err) {
    handleCooldownError(reason, err);
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

// =============================================================================
// Next Button Utilities
// =============================================================================

function getNextRoundButtonElement() {
  return getNextButton();
}

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
      btn.dataset.nextFinalized = CONFIG.NEXT_FINALIZED_STATE.PENDING;
    }
  } catch {}
}

function safeEnableNextRoundButton(context) {
  try {
    enableNextRoundButton();
    return true;
  } catch (err) {
    safeExecute(
      () => console.debug(`battleClassic: enableNextRoundButton after ${context} failed`, err),
      `safeEnableNextRoundButton (${context})`,
      ERROR_LEVELS.DEBUG
    );
    return false;
  }
}

function prepareNextButtonForUse(context) {
  const btn = getNextRoundButtonElement();
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

// =============================================================================
// Selection Utilities
// =============================================================================

function resolveStatValues(store, stat) {
  const { playerVal, opponentVal } = getPlayerAndOpponentValues(stat, undefined, undefined, {
    store
  });

  return {
    playerVal: Number.isFinite(playerVal) ? playerVal : 0,
    opponentVal: Number.isFinite(opponentVal) ? opponentVal : 0
  };
}

function stopActiveSelectionTimer() {
  if (STATE.activeSelectionTimer) {
    try {
      STATE.activeSelectionTimer.stop();
    } catch {}
    STATE.activeSelectionTimer = null;
  }
  try {
    const el = getNextRoundTimer();
    if (el) el.textContent = "";
  } catch {}
  if (STATE.failSafeTimerId) {
    clearTimeout(STATE.failSafeTimerId);
    STATE.failSafeTimerId = null;
  }
}

function clearOpponentPromptFallbackTimer() {
  if (typeof window === "undefined") return;
  const id = getOpponentPromptFallbackTimerId();
  if (id) {
    clearScheduled(id);
  }
  setOpponentPromptFallbackTimerId(0);
}

async function waitForStatButtonsReady() {
  const statButtonsReadyPromise =
    typeof window !== "undefined" && window.statButtonsReadyPromise
      ? window.statButtonsReadyPromise
      : Promise.resolve();
  await statButtonsReadyPromise;
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
      const timeoutId = scheduleDelayed(() => {
        try {
          showSnackbar(t("ui.opponentChoosing"));
          recordOpponentPromptTimestamp(getCurrentTimestamp());
        } catch {}
        clearOpponentPromptFallbackTimer();
      }, resolvedDelay);

      if (timeoutId !== null && typeof window !== "undefined") {
        setOpponentPromptFallbackTimerId(timeoutId);
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

// Expose globally for use by selectionHandler
if (typeof window !== "undefined") {
  window.__battleClassicStopSelectionTimer = stopActiveSelectionTimer;
}

// =============================================================================
// Round Result Handling
// =============================================================================

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
  let enginePointsToWin = null;
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
    if (typeof getPointsToWin === "function") {
      try {
        const candidate = Number(getPointsToWin());
        if (Number.isFinite(candidate)) {
          enginePointsToWin = candidate;
        }
      } catch {}
    }
  } catch (err) {
    console.debug("battleClassic: checking match end failed", err);
  }

  const scores = {
    player: Number(snapshot?.playerScore ?? engineScores?.playerScore) || 0,
    opponent: Number(snapshot?.opponentScore ?? engineScores?.opponentScore) || 0
  };

  const targetPoints = (() => {
    // First try snapshot or engine scores
    const candidatePoints = Number(snapshot?.pointsToWin ?? engineScores?.pointsToWin);
    if (Number.isFinite(candidatePoints) && candidatePoints > 0) {
      return candidatePoints;
    }
    // Fallback to engine points to win
    if (Number.isFinite(enginePointsToWin) && enginePointsToWin > 0) {
      return enginePointsToWin;
    }
    return null;
  })();

  if (!matchEnded && Number.isFinite(targetPoints) && targetPoints > 0) {
    if (scores.player >= targetPoints || scores.opponent >= targetPoints) {
      matchEnded = true;
      snapshot = snapshot || {};
    }
  }

  if (!matchEnded) {
    return false;
  }

  let outcome = typeof snapshot?.outcome === "string" ? snapshot.outcome : "";
  if (!outcome) {
    if (scores.player > scores.opponent) outcome = "matchWinPlayer";
    else if (scores.opponent > scores.player) outcome = "matchWinOpponent";
    else outcome = "matchDraw";
  }

  showEndModal(store, { outcome, scores });
  return true;
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
    btn.dataset.nextFinalized = CONFIG.NEXT_FINALIZED_STATE.COMPLETE;
  }
  logNextButtonRecovery("selection failure", btn, { cooldownStarted });
}

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

// =============================================================================
// Selection Finalization
// =============================================================================

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
      if (!STATE.hasLoggedFinalizeSelectionUpdateFailure) {
        STATE.hasLoggedFinalizeSelectionUpdateFailure = true;
        if (isDevelopmentEnvironment()) {
          safeExecute(
            () =>
              console.debug("battleClassic: updateRoundCounterDisplay after selection failed", err),
            "finalizeSelectionReady.updateRoundCounterDisplay",
            ERROR_LEVELS.DEBUG
          );
        }
      }
    } finally {
      try {
        const finalizedBtn = getNextRoundButtonElement();
        if (finalizedBtn) {
          try {
            setNextButtonReadyAttributes(finalizedBtn);
          } catch {}
        }
        setNextButtonFinalizedState();
      } catch (contextErr) {
        if (isDevelopmentEnvironment()) {
          safeExecute(
            () => console.debug("battleClassic: marking next button finalized failed", contextErr),
            "finalizeSelectionReady.markFinalized",
            ERROR_LEVELS.DEBUG
          );
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

// =============================================================================
// Stat Button Handling
// =============================================================================

async function handleStatButtonClick(store, stat, btn) {
  console.debug("battleClassic: stat button click handler invoked");
  window.__statButtonClickCalled = true;
  if (!btn || btn.disabled) return;
  const container =
    getStatButtonsContainer() ?? (btn instanceof HTMLElement ? btn.parentElement : null);
  const buttons = container ? getStatButtons(container) : [];
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

  if (buttons.length === 0 && container) {
    const fallbackButtons = getStatButtons(container);
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
 * Render stat buttons for the current round and bind click handlers.
 *
 * @summary Creates buttons for each stat, enables them, and wires selection handlers.
 *
 * @param {object} store - The battle store instance, managing the game's state including selections and rounds.
 * @returns {void}
 * @pseudocode
 * 1. Obtain references to the document and the stat-buttons container.
 * 2. Validate that the global `STATS` array is properly defined.
 * 3. Initialize or update a listener registry for tracking button attachments in test environments.
 * 4. Reset the cooldown flag in the store.
 * 5. Disable the "Next Round" button to prevent premature advancement.
 * 6. Detach any previously wired stat hotkeys.
 * 7. Clear the existing content of the stat-buttons container.
 * 8. Iterate through each stat in the `STATS` array:
 *    a. Create a button element for the stat, setting its text, classes, and accessibility attributes.
 *    b. Attach a click event listener to the button that calls `handleStatButtonClick` with the store, stat, and button element.
 *    c. Record the stat button attachment in the listener registry (if active).
 *    d. Append the button and its accessibility description to the container.
 * 9. After all buttons are created, set the `data-buttons-ready` attribute on the container.
 * 10. Enable the newly created stat buttons and wire new keyboard hotkeys for them.
 */
export function renderStatButtons(store) {
  const doc = getDocumentRef();
  if (!doc) {
    return;
  }

  const container = doc.getElementById("stat-buttons");
  if (!container) {
    return;
  }

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
    if (typeof STATE.detachStatHotkeys === "function") {
      STATE.detachStatHotkeys();
    }
  } catch {}
  STATE.detachStatHotkeys = undefined;
  container.innerHTML = "";

  for (const stat of STATS) {
    const btn = doc.createElement("button");
    btn.type = "button";
    btn.textContent = String(stat);
    btn.classList.add("stat-button");
    btn.setAttribute("data-stat", String(stat));
    btn.setAttribute("data-player", "0");
    btn.setAttribute("data-testid", "stat-button");
    const descId = `stat-${String(stat)}-desc`;
    btn.setAttribute("aria-describedby", descId);
    btn.setAttribute("aria-label", `Select ${stat} stat for battle`);
    let desc;
    try {
      desc = doc.getElementById(descId);
      if (!desc) {
        desc = doc.createElement("span");
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
      STATE.detachStatHotkeys = wireStatHotkeys(Array.from(buttons));
    } catch {}
  } catch {}
}

// =============================================================================
// Timer Management
// =============================================================================

async function beginSelectionTimer(store) {
  const TEST_ENV_FLAG =
    (typeof process !== "undefined" && process.env?.VITEST === "true") ||
    (typeof process !== "undefined" && process.env?.NODE_ENV === "test") ||
    (typeof globalThis !== "undefined" && Boolean(globalThis.__TEST__));

  if (TEST_ENV_FLAG) {
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
    STATE.activeSelectionTimer = timer;
    timer.start();
    return;
  }

  STATE.activeSelectionTimer = await startTimer(async (stat) => {
    if (STATE.failSafeTimerId) {
      clearTimeout(STATE.failSafeTimerId);
      STATE.failSafeTimerId = null;
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

  // Fail-safe: ensure round resolves if timer binding fails
  try {
    const ms = (Number(getDefaultTimer("roundTimer")) || 2) * 1000 + 100;
    STATE.failSafeTimerId = setTimeout(async () => {
      STATE.failSafeTimerId = null;
      try {
        const btn = getNextButton();
        const scoreEl = getScoreDisplay();
        const playerValue = getPlayerScoreValue(scoreEl);
        const opponentValue = getOpponentScoreValue(scoreEl);
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

// =============================================================================
// Round Cycle Management
// =============================================================================

async function startRoundCycle(store, options = {}) {
  const { skipStartRound = false } = options;
  if (STATE.isStartingRoundCycle) return;
  STATE.isStartingRoundCycle = true;
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
        if (err instanceof JudokaDataLoadError) {
          throw err;
        }
        if (store && store.__roundSelectFallbackShown) {
          throw new Error(`startRound failed in fallback mode: ${err.message}`);
        }
      }
    }

    if (roundStarted) {
      clearRoundSelectFallback(store);
      broadcastBattleState("roundStart");
    }

    updateRoundCounterDisplay({ expectAdvance: true });

    try {
      renderStatButtons(store);
    } catch (err) {
      console.error("battleClassic: renderStatButtons failed", err);
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
    if (err instanceof JudokaDataLoadError || (store && store.__roundSelectFallbackShown)) {
      throw err;
    }
  } finally {
    STATE.isStartingRoundCycle = false;
  }
}

function clearRoundSelectFallback(store) {
  if (typeof document === "undefined") {
    if (store && typeof store === "object") {
      store.__roundSelectFallbackShown = false;
    }
    return;
  }
  const fallbackBtn = getRoundSelectFallback();
  if (fallbackBtn) {
    fallbackBtn.remove();
  }
  const fallbackMsg = getRoundSelectError();
  if (fallbackMsg) {
    fallbackMsg.remove();
  }
  if (store && typeof store === "object") {
    store.__roundSelectFallbackShown = false;
  }
}

function showRoundSelectFallback(store) {
  const fallbackInDom = hasRoundSelectFallback();
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

// =============================================================================
// Scoreboard & UI Setup
// =============================================================================

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

function setupInitialUI() {
  setupScoreboard({ pauseTimer() {}, resumeTimer() {}, startCooldown() {} });

  const opponentCard = getOpponentCard();
  if (opponentCard) {
    opponentCard.classList.remove("opponent-hidden");
    opponentCard.classList.add("is-obscured");
  }

  initScoreboardAdapter();
  updateScore(0, 0);

  const sd = getScoreDisplay();
  if (sd) {
    const hasExcessWhitespace = /\n\s{2,}/.test(sd.innerHTML);
    if (hasExcessWhitespace) {
      sd.innerHTML = `<span data-side="player"><span data-part="label">You:</span> <span data-part="value">0</span></span>\n<span data-side="opponent"><span data-part="label">Opponent:</span> <span data-part="value">0</span></span>`;
    }
  }

  updateRoundCounter(0);
  const rc = getRoundCounter();
  if (rc && !rc.textContent) rc.textContent = "Round 0";

  wireControlButtons();
}

// =============================================================================
// Event Wiring
// =============================================================================

function wireCooldownEvents(store) {
  const markFromEvent = () => {
    markCooldownStarted(store);
  };
  onBattleEvent("nextRoundCountdownStarted", markFromEvent);
  onBattleEvent("control.countdown.started", markFromEvent);
  onBattleEvent("countdownStart", markFromEvent);
}

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

function wireControlButtons(store) {
  const resolveStore = () => {
    if (store && typeof store === "object") {
      return store;
    }
    if (typeof window !== "undefined" && window.battleStore) {
      return window.battleStore;
    }
    return {};
  };

  const nextBtn = getNextButton();
  if (nextBtn && !nextBtn.__controlBound) {
    nextBtn.addEventListener("click", onNextButtonClick);
    nextBtn.__controlBound = true;
  }

  const replayBtn = getReplayButton();
  if (replayBtn && !replayBtn.__controlBound) {
    replayBtn.addEventListener("click", async () => {
      const activeStore = resolveStore();
      stopActiveSelectionTimer();
      STATE.isStartingRoundCycle = false;
      resetOpponentPromptTimestamp();
      resetRoundCounterTracking();

      if (activeStore.statTimeoutId) {
        clearTimeout(activeStore.statTimeoutId);
        activeStore.statTimeoutId = null;
      }
      if (activeStore.autoSelectId) {
        clearTimeout(activeStore.autoSelectId);
        activeStore.autoSelectId = null;
      }

      await handleReplay(activeStore);
      await waitForStatButtonsReady();
      updateScore(0, 0);
      updateRoundCounter(1);
      resetFallbackScores();
    });
    replayBtn.__controlBound = true;
  }

  const quitBtn = getQuitButton();
  if (quitBtn && !quitBtn.__controlBound) {
    quitBtn.addEventListener("click", () => quitMatch(resolveStore(), quitBtn));
    quitBtn.__controlBound = true;
  }

  bindHomeButton(store);
}

async function handleRoundStartEvent(store, evt) {
  const eventType = typeof evt === "string" ? evt : evt?.type;
  const eventDetail = evt && typeof evt === "object" && "detail" in evt ? evt.detail : undefined;
  const manualRoundStart =
    eventType === "round.start" &&
    eventDetail &&
    typeof eventDetail === "object" &&
    eventDetail?.source === "next-button";

  if (manualRoundStart) {
    STATE.lastManualRoundStartTimestamp = getCurrentTimestamp();
    if (typeof window !== "undefined") {
      try {
        window.__lastManualRoundStartTimestamp = STATE.lastManualRoundStartTimestamp;
      } catch {}
    }
  }

  if (eventType === "ready") {
    queueMicrotask(async () => {
      const now = getCurrentTimestamp();
      const hasManualStamp = STATE.lastManualRoundStartTimestamp > 0;
      const elapsedSinceManual = hasManualStamp
        ? now - STATE.lastManualRoundStartTimestamp
        : Number.POSITIVE_INFINITY;
      const skipDueToManual =
        hasManualStamp &&
        elapsedSinceManual >= 0 &&
        elapsedSinceManual < CONFIG.READY_SUPPRESSION_WINDOW_MS;
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

function wireRoundCycleEvents(store) {
  onBattleEvent("round.start", (evt) => handleRoundStartEvent(store, evt));
  onBattleEvent("ready", (evt) => handleRoundStartEvent(store, evt));
  onBattleEvent("roundStarted", async () => {
    if (STATE.isStartingRoundCycle) return;
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
        if (!getRoundSelectError()) {
          showRoundSelectFallback(store);
        }
      } catch {}
    };
    window.__classicBattleExitListener = exitListener;
    window.addEventListener(LOAD_ERROR_EXIT_EVENT, exitListener);
  }
}

// Badge Management functions moved to badgeManager.js
// Imported: initBattleStateBadge, setBadgeText, initBadgeSync

// =============================================================================
// Match Initialization
// =============================================================================

async function initializeMatchStart(store) {
  console.log("battleClassic: initializeMatchStart");
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

// =============================================================================
// Initialization Phases
// =============================================================================

async function initializePhase1_Utilities() {
  console.log("battleClassic: initializePhase1_Utilities");
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
}

async function initializePhase2_UI() {
  console.log("battleClassic: initializePhase2_UI");
  initBattleStateBadge();
  initBattleStateBadge({ force: false });

  await initFeatureFlags();

  // Enable test mode if the enableTestMode feature flag is set
  if (isEnabled("enableTestMode")) {
    setTestMode(true);
  }

  initBattleStateBadge({ force: false });
  initDebugFlagHud();

  setupInitialUI();
}

async function initializePhase3_Engine(store) {
  console.log("battleClassic: initializePhase3_Engine");
  createBattleEngine(window.__ENGINE_CONFIG || {});
  bridgeEngineEvents();

  store.orchestrator = await initClassicBattleOrchestrator(store, startRound);
}

async function initializePhase4_EventHandlers(store) {
  console.log("battleClassic: initializePhase4_EventHandlers");
  wireCardEventHandlers(store);
  wireCooldownEvents(store);
  bindUIHelperEventHandlersDynamic();
  wireGlobalBattleEvents(store);
  initDebugPanel();
  initBattleStateBadge({ force: false });

  wireRoundCycleEvents(store);
}

/**
 * Initialize the Classic Battle page.
 *
 * @summary Orchestrates the bootstrap sequence for the Classic Battle interface,
 * following a 5-phase initialization: utilities, UI, engine, event handlers, and match start.
 *
 * @returns {Promise<void>} A Promise that resolves when the Classic Battle page has been fully initialized.
 * @pseudocode
 * 1. Execute `initializePhase1_Utilities()` to set up core utilities like the scheduler and expose test APIs.
 * 2. Execute `initializePhase2_UI()` to configure the initial user interface, including the scoreboard and feature flags.
 * 3. Create a battle store instance using `createBattleStore()` to manage the game's state.
 * 4. If in a browser environment, expose the created battle store globally as `window.battleStore`.
 * 5. Execute `initializePhase3_Engine()` to set up the battle engine and orchestrator.
 * 6. Execute `initializePhase4_EventHandlers()` to wire up all necessary event listeners and control buttons.
 * 7. Execute `initializeMatchStart()` to initiate the match, typically by showing the round selection modal.
 * 8. If in a browser environment, set `window.__battleInitComplete` to `true` to signal successful initialization.
 * 9. Catch any errors during the bootstrap process and display a fatal initialization error to the user.
 */
export async function init() {
  console.log("battleClassic: init()");
  if (typeof window !== "undefined") {
    window.__battleInitError = undefined;
  }
  try {
    await initializePhase1_Utilities();
    await initializePhase2_UI();

    const store = createBattleStore();
    if (typeof window !== "undefined") {
      window.battleStore = store;
    }

    wireControlButtons(store);

    await initializePhase3_Engine(store);
    await initializePhase4_EventHandlers(store);

    await initializePhase3_Engine(store);
    await initializePhase4_EventHandlers(store);
    await initializeMatchStart(store);

    if (typeof window !== "undefined") {
      window.__battleInitComplete = true;
      window.__battleInitError = undefined;
    }
  } catch (err) {
    console.error("battleClassic: bootstrap failed", err);
    if (typeof window !== "undefined") {
      window.__battleInitComplete = false;
      if (err instanceof Error) {
        window.__battleInitError = { name: err.name, message: err.message, stack: err.stack };
      } else {
        window.__battleInitError = err;
      }
    }
    showFatalInitError(err);
  }
}

// =============================================================================
// Auto-initialization in Browser Context
// =============================================================================

const isTestEnvironment =
  typeof process !== "undefined" &&
  (process.env?.VITEST === "true" || process.env?.NODE_ENV === "test");

if (!isTestEnvironment && typeof document !== "undefined" && document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initBadgeSync();
    init().catch((err) => {
      console.error("battleClassic: init failed", err);
      showFatalInitError(err);
    });
  });
} else if (!isTestEnvironment && typeof document !== "undefined") {
  initBadgeSync();
  init().catch((err) => {
    console.error("battleClassic: init failed", err);
    showFatalInitError(err);
  });
}
