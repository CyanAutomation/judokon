import { updateDebugPanel } from "./debugPanel.js";
import { showSelectionPrompt } from "./snackbar.js";
import { startTimer } from "./timerService.js";
import { handleStatSelectionTimeout } from "./autoSelectHandlers.js";

import * as scoreboard from "../setupScoreboard.js";
import { dismissCountdownSnackbar } from "../CooldownRenderer.js";
import { attachCountdownCoordinator } from "./countdownCoordinator.js";
import { handleStatSelection } from "./selectionHandler.js";
import * as roundManagerModule from "./roundManager.js";
import {
  onBattleEvent,
  emitBattleEvent,
  emitBattleEventWithAliases,
  getBattleEventTarget
} from "./battleEvents.js";
import { EVENT_TYPES } from "./eventCatalog.js";
import { battleLog } from "./battleLogger.js";
import {
  validateRoundStartedEvent,
  validateStatSelectedEvent,
  validateRoundEvaluatedEvent
} from "./eventValidators.js";
import { createStatButtonCache } from "./statButtonCache.js";
import { resolveStatValues } from "./statValuesHelper.js";
import { updateSnackbar as _updateSnackbar } from "../showSnackbar.js";
import { computeNextRoundCooldown } from "../timers/computeNextRoundCooldown.js";
// import { createRoundTimer } from "../timers/createRoundTimer.js";
import { syncScoreDisplay } from "./uiHelpers.js";
import { disableStatButtons, resetStatButtons } from "./statButtons.js";
import { runWhenIdle } from "./idleCallback.js";
import { runAfterFrames } from "../../utils/rafUtils.js";
import { getOpponentPromptTimestamp } from "./opponentPromptTracker.js";
import { updateRoundCounter, clearRoundCounter } from "../roundStatusDisplay.js";
import {
  computeOpponentPromptWaitBudget,
  waitForDelayedOpponentPromptDisplay,
  DEFAULT_OPPONENT_PROMPT_BUFFER_MS as INTERNAL_DEFAULT_OPPONENT_PROMPT_BUFFER_MS
} from "./opponentPromptWaiter.js";

// New utility imports
import {
  selectTimerFactory,
  selectRendererFactory,
  instantiateTimer,
  normalizeRendererOptions,
  resolveOpponentPromptBuffer
} from "./cooldownResolver.js";
import { createPostResetScheduler } from "./frameScheduler.js";

/**
 * @summary Safety buffer exported for backward compatibility with existing imports.
 * @pseudocode DEFAULT_OPPONENT_PROMPT_BUFFER_MS = 250
 */
export const DEFAULT_OPPONENT_PROMPT_BUFFER_MS = INTERNAL_DEFAULT_OPPONENT_PROMPT_BUFFER_MS;

let showMatchSummaryModal = null;
// Reference to avoid unused-import lint complaint when the function is re-exported
// or only used in other environments.
void _updateSnackbar;

let hasScheduledMatchSummaryPreload = false;
const statButtonCache = createStatButtonCache("#stat-buttons button[data-stat]", "stat-buttons");

function preloadMatchSummaryModal() {
  import("/src/helpers/classicBattle/matchSummaryModal.js")
    .then((m) => {
      showMatchSummaryModal = m.showMatchSummaryModal;
    })
    .catch(() => {
      // Preload failed; continue with fallback
    });
}

function collectStatButtons(store) {
  if (store && typeof store === "object" && store.statButtonEls) {
    try {
      return Object.values(store.statButtonEls).filter(
        (btn) => btn && typeof btn === "object" && typeof btn.classList !== "undefined"
      );
    } catch {
      // Continue to query fallback
    }
  }

  // Fallback to DOM query
  try {
    return statButtonCache.get();
  } catch {
    // Silently continue
  }
  return [];
}

function hydrateStatButtons(store) {
  if (!store?.statButtonEls) {
    store.statButtonEls = collectStatButtons(store).reduce((acc, btn) => {
      const statKey = btn?.dataset?.stat;
      if (statKey) acc[statKey] = btn;
      return acc;
    }, {});
  }
  return store.statButtonEls;
}

function clearStatButtonSelections(store) {
  const buttons = collectStatButtons(store);
  buttons.forEach((btn) => {
    try {
      btn.classList.remove("selected");
      btn.style?.removeProperty?.("background-color");
      if (typeof btn.blur === "function") {
        btn.blur();
      }
    } catch {
      // Silently continue on individual button errors
    }
  });
  return buttons;
}
function scheduleMatchSummaryPreload() {
  if (hasScheduledMatchSummaryPreload) return;
  hasScheduledMatchSummaryPreload = true;
  try {
    runWhenIdle(preloadMatchSummaryModal);
  } catch {
    try {
      preloadMatchSummaryModal();
    } catch {}
  }
}

/**
 * Resolve timer/renderer factories used for the round cooldown.
 *
 * @pseudocode
 * 1. Prefer injected factories when provided via `overrides`.
 * 2. Fallback to statically imported factories when overrides are missing.
 * 3. Instantiate the timer and return both timer and renderer handles.
 *
 * @param {object} store
 * @param {{
 *   createRoundTimer?: () => any,
 *   attachCooldownRenderer?: (timer: any, secs: number, opts?: object) => void
 * }} [overrides]
 * @returns {Promise<{ timer: any, renderer: ((timer: any, secs: number, opts?: object) => void)|null }>}
 */
export async function resolveCooldownDependencies(store, overrides = {}) {
  void store; // Acknowledge parameter
  const timerFactory = selectTimerFactory(overrides?.createRoundTimer);
  const renderer = selectRendererFactory(overrides?.attachCooldownRenderer);

  return {
    timer: instantiateTimer(timerFactory),
    renderer
  };
}

/**
 * Attach renderer and start the next-round countdown with optional gating.
 *
 * @pseudocode
 * 1. Attach the renderer when both timer and renderer are available.
 * 2. When delaying the opponent prompt, wait for the prompt visibility window.
 * 3. Start the timer and swallow failures to keep UI responsive.
 *
 * @param {{ timer: any, renderer: ((timer: any, secs: number, opts?: object) => void)|null }} resolved
 * @param {{
 *   seconds: number,
 *   delayOpponentMessage?: boolean,
 *   rendererOptions?: object,
 *   promptBudget?: { bufferMs: number, totalMs: number }|null,
 *   waitForDelayedOpponentPromptDisplay?: typeof waitForDelayedOpponentPromptDisplay,
 *   getOpponentPromptTimestamp?: typeof getOpponentPromptTimestamp
 * }} [config]
 * @returns {Promise<void>}
 */
export async function startRoundCooldown(resolved, config = {}) {
  const timer = extractTimer(resolved);
  if (!timer) return;

  const renderer = selectRenderer(resolved);
  const seconds = config?.seconds;
  const rendererOptions = normalizeRendererOptions(config?.rendererOptions);

  attachCountdownCoordinator({
    timer,
    duration: seconds,
    renderer,
    rendererOptions,
    onFinished: () => {
      try {
        emitBattleEvent("control.countdown.completed");
      } catch {}
      try {
        emitBattleEvent("round.start", { source: "auto", via: "roundUI.startRoundCooldown" });
      } catch {}
    }
  });

  if (config?.delayOpponentMessage) {
    const waitFn =
      config?.waitForDelayedOpponentPromptDisplay || waitForDelayedOpponentPromptDisplay;
    const getTimestamp = config?.getOpponentPromptTimestamp || getOpponentPromptTimestamp;
    if (shouldWaitForOpponentPrompt(getTimestamp)) {
      const waitArgs = config?.promptBudget || undefined;
      const waitOptions = derivePromptWaitOptions(rendererOptions);
      await waitForOpponentPrompt(waitFn, waitArgs, waitOptions);
    }
  }

  // Add lifecycle tracing + guarded recovery: if cooldown completes without
  // a subsequent round start, emit a safe reset event to re-enter the flow.
  try {
    // console.debug(`classicBattle.trace cooldown:start t=${Date.now()} secs=${seconds}`);
  } catch {}
  try {
    const numericDuration = Number(seconds);
    if (Number.isFinite(numericDuration)) {
      emitBattleEvent("countdownStart", { duration: numericDuration });
      emitBattleEvent("control.countdown.started", { durationMs: numericDuration * 1000 });
      emitBattleEvent("nextRoundCountdownStarted", { durationMs: numericDuration * 1000 });
    }
  } catch {}
  await startTimerSafely(timer, seconds);
  try {
    // console.debug(`classicBattle.trace cooldown:end t=${Date.now()} secs=${seconds}`);
  } catch {}
  try {
    const target = getBattleEventTarget?.();
    if (target && typeof target.addEventListener === "function") {
      let started = false;
      const onStart = () => {
        started = true;
        target.removeEventListener("roundStarted", onStart);
        try {
          // console.debug(`classicBattle.trace cooldown:observedRoundStarted t=${Date.now()}`);
        } catch {}
      };
      target.addEventListener("roundStarted", onStart);
      // After a short post-cooldown buffer, check if round started; if not, recover.
      setTimeout(
        () => {
          try {
            if (!started) {
              try {
                // console.debug(`classicBattle.trace cooldown:recoveryResetUI t=${Date.now()}`);
              } catch {}
              emitBattleEvent("game:reset-ui", {});
            }
          } catch {}
        },
        Math.max(250, Number(seconds) * 1000 + 250)
      );
    }
  } catch {}
}

function extractTimer(resolved) {
  const timer = resolved?.timer;
  return timer && typeof timer.start === "function" ? timer : null;
}

function selectRenderer(resolved) {
  const renderer = resolved?.renderer;
  return typeof renderer === "function" ? renderer : null;
}

function shouldWaitForOpponentPrompt(getTimestamp) {
  if (typeof getTimestamp !== "function") {
    return true;
  }
  try {
    const timestamp = Number(getTimestamp());
    return !Number.isFinite(timestamp) || timestamp <= 0;
  } catch {}
  return true;
}

function derivePromptWaitOptions(rendererOptions) {
  const intervalMs = Number(rendererOptions?.promptPollIntervalMs);
  return { intervalMs };
}

async function waitForOpponentPrompt(waitFn, waitArgs, waitOptions) {
  if (typeof waitFn !== "function") {
    return;
  }
  await runWithRetry(() => waitFn(waitArgs, waitOptions), 1);
}

async function runWithRetry(executor, retries = 0) {
  if (typeof executor !== "function") {
    return;
  }
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await executor();
    } catch {
      attempt += 1;
      if (attempt > retries) {
        return;
      }
    }
  }
}

async function startTimerSafely(timer, seconds) {
  try {
    await timer.start(seconds);
  } catch {}
}

/**
 * Apply UI updates for a newly started round.
 *
 * Resets visible state for stat buttons, updates the round counter and score
 * display, starts the round timer and registers the stall timeout that may
 * auto-select a stat when the player does not act.
 *
 * @pseudocode
 * 1. Reset stat buttons and clear any round result text.
 * 2. Sync the score display and update the round counter.
 * 3. Show the stat selection prompt and start the selection timer which calls
 *    `handleStatSelection` when a stat button is pressed.
 * 4. Register stalled-selection timeout via `handleStatSelectionTimeout`.
 * 5. Save `stallTimeoutMs` on the store and refresh the debug panel.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store - Battle state store.
 * @param {number} roundNumber - Current round number to display.
 * @param {number} [stallTimeoutMs=5000] - Delay before auto-select kicks in.
 * @returns {void}
 */
export function applyRoundUI(store, roundNumber, stallTimeoutMs = 5000, options = {}) {
  const { skipTimer = false } = options || {};
  try {
    // console.log("INFO: applyRoundUI called for round", roundNumber);
  } catch {}
  resetStatButtons();
  try {
    // console.log("INFO: applyRoundUI -> requested resetStatButtons (will re-enable on next frame)");
  } catch {}
  // Do not force-disable the Next button here; it should remain
  // ready after cooldown so tests and users can advance immediately.
  const roundResultEl = document.getElementById("round-result");
  if (roundResultEl) roundResultEl.textContent = "";
  try {
    syncScoreDisplay();
  } catch {}
  updateRoundCounter(roundNumber);
  showSelectionPrompt();
  const playerCard =
    store.playerCardEl || (store.playerCardEl = document.getElementById("player-card"));
  const opponentCard =
    store.opponentCardEl || (store.opponentCardEl = document.getElementById("opponent-card"));
  hydrateStatButtons(store);
  if (!skipTimer) {
    startTimer((stat, opts) => {
      const { playerVal, opponentVal } = resolveStatValues(playerCard, opponentCard, stat);
      return handleStatSelection(store, stat, { playerVal, opponentVal, ...opts });
    }, store);
  }
  store.stallTimeoutMs = stallTimeoutMs;
  // Schedule stall prompt and optional auto-select using the unified helper
  // without double-wrapping the timeout. The helper manages its own timer
  // and records `store.autoSelectId` for later cancellation.
  handleStatSelectionTimeout(
    store,
    (s, opts) => {
      const { playerVal, opponentVal } = resolveStatValues(playerCard, opponentCard, s);
      return handleStatSelection(store, s, { playerVal, opponentVal, ...opts });
    },
    store.stallTimeoutMs
  );
  updateDebugPanel();
  if (store && typeof store === "object") {
    store.roundReadyForInput = true;
  }
  let container = null;
  try {
    container = typeof document !== "undefined" ? document.getElementById("stat-buttons") : null;
    if (container && typeof container.dataset !== "undefined") {
      container.dataset.selectionInProgress = "false";
    }
  } catch {}
  // Emit a state change for fallback flows so a state listener can enable buttons.
  // But don't re-emit if a selection is in progress.
  try {
    const selectionInProgress = container?.dataset?.selectionInProgress;
    if (store?.roundReadyForInput === true && selectionInProgress !== "true") {
      const roundsPlayed = Number(store?.roundsPlayed);
      const roundIndex = Number.isFinite(roundsPlayed)
        ? roundsPlayed
        : Number.isFinite(roundNumber)
          ? Math.max(0, roundNumber - 1)
          : 0;
      emitBattleEventWithAliases(EVENT_TYPES.STATE_TRANSITIONED, {
        from: null,
        to: "roundSelect",
        context: { roundIndex },
        catalogVersion: "fallback",
        source: "roundUI.applyRoundUI"
      });
    }
  } catch {}
}

/**
 * Handle a `roundStarted` battle event.
 *
 * @param {CustomEvent} event
 * @param {{ applyRoundUI?: typeof applyRoundUI }} [deps]
 * @pseudocode
 * 1. Dismiss any countdown snackbar from previous cooldown.
 * 2. Dismiss any opponent snackbar from stat selection.
 * 3. Read `store` and `roundNumber` from the event detail.
 * 4. When both are valid, call the injected `applyRoundUI` implementation.
 * @returns {void}
 */
export async function handleRoundStartedEvent(event, deps = {}) {
  const { applyRoundUI: applyRoundUiFn = applyRoundUI } = deps;
  const validated = validateRoundStartedEvent(event);
  if (validated) {
    const { store, roundNumber } = validated;
    battleLog.trace(`event:roundStarted t=${Date.now()} round=${roundNumber}`);
    applyRoundUiFn(store, roundNumber);
  }

  // Dismiss countdown snackbar when new round starts (fire-and-forget)
  try {
    if (typeof dismissCountdownSnackbar === "function") {
      void dismissCountdownSnackbar();
    }
  } catch {
    // Non-critical
  }

  // Dismiss opponent snackbar when new round starts (fire-and-forget)
  try {
    void import("./uiEventHandlers.js").then(({ dismissOpponentSnackbar }) => {
      if (typeof dismissOpponentSnackbar === "function") {
        void dismissOpponentSnackbar();
      }
    });
  } catch {
    // Non-critical
  }
}

/**
 * Handle a `statSelected` battle event.
 *
 * @param {CustomEvent} event
 * @param {{ snackbarManager?: any }} [deps]
 * @pseudocode
 * 1. Pull `stat`, `store`, and `opts` from the event detail and bail when missing.
 * 2. Add the `selected` class to the chosen button.
 * 3. Show "You Picked:" message via SnackbarManager with NORMAL priority (never shown for delayed opponent messages).
 * 4. Emit `statButtons:disable` to lock the stat buttons after selection.
 * Note: Opponent messaging is handled separately in uiEventHandlers.js via HIGH priority snackbar.
 * @returns {void}
 */
export function handleStatSelectedEvent(event) {
  battleLog.trace(`event:statSelected t=${Date.now()}`);
  const validated = validateStatSelectedEvent(event);
  if (!validated) return;
  const { stat, store } = validated;
  if (!store) return;
  hydrateStatButtons(store);
  if (!store.statButtonEls) return;
  const btn = store.statButtonEls[stat];
  if (btn) {
    try {
      // console.warn(`[test] addSelected: stat=${stat} label=${(btn.textContent || "").trim()}`);
    } catch {}
    btn.classList.add("selected");
    // Note: "You Picked:" message removed - opponent messaging in uiEventHandlers handles all snackbar coordination
  }
  try {
    disableStatButtons?.();
  } catch {}
  emitBattleEvent("statButtons:disable");
}

/**
 * Handle a `round.evaluated` battle event.
 *
 * @param {CustomEvent} event
 * @param {object} [deps]
 * @param {typeof scoreboard} [deps.scoreboard]
 * @param {(result: object, onReplay: () => Promise<void>) => Promise<void>|void} [deps.showMatchSummary]
 * @param {typeof handleReplay} [deps.handleReplay]
 * @param {typeof isOrchestrated} [deps.isOrchestrated]
 * @param {typeof computeNextRoundCooldown} [deps.computeNextRoundCooldown]
 * @param {() => any} [deps.createRoundTimer]
 * @param {(timer: any, secs: number) => void} [deps.attachCooldownRenderer]
 * @param {typeof syncScoreDisplay} [deps.syncScoreDisplay]
 * @param {typeof updateDebugPanel} [deps.updateDebugPanel]
 * @pseudocode
 * 1. Exit early when the event lacks a round result.
 * 2. Update the score using the injected scoreboard API.
 * 3. When the match ends, clear the round counter, show the summary modal, and emit `matchOver`.
 * 4. Otherwise, compute the next-round cooldown and, if not orchestrated, configure and start the timer with injected helpers.
 * 5. Clear stat button visuals, keep them disabled until the next round, and refresh the debug panel.
 * @returns {Promise<void>}
 */
export async function handleRoundResolvedEvent(event, deps = {}) {
  const {
    scoreboard: scoreboardApi = scoreboard,
    showMatchSummary = showMatchSummaryModal,
    computeNextRoundCooldown: computeNextRoundCooldownFn = computeNextRoundCooldown,
    createRoundTimer: createRoundTimerFn,
    attachCooldownRenderer: attachCooldownRendererFn,
    syncScoreDisplay: syncScoreDisplayFn = syncScoreDisplay,
    updateDebugPanel: updateDebugPanelFn = updateDebugPanel
  } = deps;
  const handleReplayFn =
    typeof deps.handleReplay === "function"
      ? deps.handleReplay
      : (() => {
          try {
            return roundManagerModule.handleReplay;
          } catch {
            return undefined;
          }
        })();
  const isOrchestratedFn =
    typeof deps.isOrchestrated === "function"
      ? deps.isOrchestrated
      : (() => {
          try {
            return roundManagerModule.isOrchestrated;
          } catch {
            return undefined;
          }
        })();
  const detail = event?.detail || {};
  const validated = validateRoundEvaluatedEvent(event);
  const resultCandidate = detail?.result;
  const hasValidResultCandidate =
    !!resultCandidate &&
    typeof resultCandidate === "object" &&
    (typeof resultCandidate.matchEnded === "boolean" ||
      typeof resultCandidate.outcome === "boolean" ||
      (typeof resultCandidate.message === "string" && resultCandidate.message.length > 0) ||
      typeof resultCandidate.playerScore === "number" ||
      typeof resultCandidate.opponentScore === "number");
  if (!validated && !hasValidResultCandidate) {
    return;
  }
  const store = detail.store;
  const result = hasValidResultCandidate
    ? resultCandidate
    : {
        outcome: detail.outcome,
        matchEnded: detail.matchEnded,
        playerScore: detail?.scores?.player ?? detail.playerScore,
        opponentScore: detail?.scores?.opponent ?? detail.opponentScore,
        message: detail.message
      };
  if (!result) return;
  if (store && typeof store === "object") {
    store.roundReadyForInput = false;
  }
  try {
    // console.debug(`classicBattle.trace event:round.evaluated t=${Date.now()}`);
  } catch {}
  try {
    document.body?.removeAttribute?.("data-stat-selected");
  } catch {}
  try {
    if (typeof scoreboardApi?.updateScore === "function") {
      scoreboardApi.updateScore(result.playerScore, result.opponentScore);
    } else if (typeof syncScoreDisplayFn === "function") {
      syncScoreDisplayFn();
    }
  } catch {}
  /**
   * Lock stat buttons by disabling them and optionally emitting a disable event.
   *
   * @pseudocode
   * 1. Attempt to disable the stat buttons via `disableStatButtons`.
   * 2. When `shouldEmitEvent` is true, emit the `statButtons:disable` battle event.
   *
   * This helper centralizes the locking logic so the post-reset scheduler can
   * re-apply the disabled state without duplicating the emit/disable calls.
   *
   * @param {boolean} [shouldEmitEvent=false] - Emit the disable event when true.
   * @returns {void}
   */
  const lockStatButtons = (shouldEmitEvent = false) => {
    try {
      disableStatButtons?.();
    } catch {}
    if (shouldEmitEvent) emitBattleEvent("statButtons:disable");
  };

  lockStatButtons(true);

  const runReset = () => {
    clearStatButtonSelections(store);
    const { handleFailure, ensureSafetyLock, markLocked } =
      createPostResetScheduler(lockStatButtons);
    try {
      disableStatButtons?.();
      markLocked();
    } catch {
      handleFailure();
    }
    ensureSafetyLock();
  };
  let didReset = false;
  const runResetOnce = () => {
    if (didReset) return;
    didReset = true;
    runReset();
  };
  let frameSchedulingSucceeded = false;
  let timeoutId = null;
  try {
    runAfterFrames(2, () => {
      if (timeoutId !== null) {
        try {
          if (typeof clearTimeout === "function") clearTimeout(timeoutId);
        } catch {}
        timeoutId = null;
      }
      runResetOnce();
    });
    frameSchedulingSucceeded = true;
  } catch {
    frameSchedulingSucceeded = false;
  }
  if (typeof setTimeout === "function") {
    timeoutId = setTimeout(() => {
      timeoutId = null;
      runResetOnce();
    }, 32);
  } else if (!frameSchedulingSucceeded) {
    runResetOnce();
  }
  const shouldCleanupDelayFlag = !!(store && typeof store === "object");
  try {
    if (result.matchEnded) {
      try {
        clearRoundCounter();
      } catch {}
      try {
        await showMatchSummary?.(result, async () => {
          if (typeof handleReplayFn === "function") {
            await handleReplayFn(store);
          }
        });
      } catch {}
      emitBattleEvent("matchOver");
    } else {
      try {
        const orchestrated = (() => {
          try {
            return typeof isOrchestratedFn === "function" && isOrchestratedFn();
          } catch {
            return false;
          }
        })();
        if (!orchestrated) {
          const delayOpponentMessageFlag =
            shouldCleanupDelayFlag &&
            Object.prototype.hasOwnProperty.call(store, "__delayOpponentMessage") &&
            store.__delayOpponentMessage === true;
          const computeCooldown =
            typeof computeNextRoundCooldownFn === "function"
              ? computeNextRoundCooldownFn
              : computeNextRoundCooldown;
          const parseSecondsFromResult = (result) => {
            const direct = Number(result);
            if (Number.isFinite(direct)) return direct;

            if (result && typeof result === "object") {
              const candidates = [result.seconds, result.value];
              for (const candidate of candidates) {
                const numeric = Number(candidate);
                if (Number.isFinite(numeric)) return numeric;
              }
            }
            return direct;
          };

          let cooldownResult;
          try {
            cooldownResult = computeCooldown();
          } catch {}
          const resolvedSeconds = parseSecondsFromResult(cooldownResult);
          const secs = Math.max(3, Number.isFinite(resolvedSeconds) ? resolvedSeconds : 3);
          const attachRendererOptions =
            deps.attachCooldownRendererOptions &&
            typeof deps.attachCooldownRendererOptions === "object"
              ? { ...deps.attachCooldownRendererOptions }
              : {};
          const resolvedBuffer = resolveOpponentPromptBuffer(cooldownResult, attachRendererOptions);
          let promptBudget = null;
          if (delayOpponentMessageFlag) {
            try {
              promptBudget = computeOpponentPromptWaitBudget(resolvedBuffer);
            } catch {
              promptBudget = computeOpponentPromptWaitBudget();
            }
            const rendererBuffer =
              resolvedBuffer !== undefined ? resolvedBuffer : promptBudget.bufferMs;
            attachRendererOptions.opponentPromptBufferMs = rendererBuffer;
            attachRendererOptions.maxPromptWaitMs = promptBudget.totalMs;
            const pollNumeric = Number(attachRendererOptions.promptPollIntervalMs);
            const resolvedPollInterval =
              Number.isFinite(pollNumeric) && pollNumeric > 0 ? pollNumeric : 75;
            attachRendererOptions.promptPollIntervalMs = Math.max(50, resolvedPollInterval);
            attachRendererOptions.waitForOpponentPrompt = true;
          } else {
            attachRendererOptions.waitForOpponentPrompt = false;
            attachRendererOptions.maxPromptWaitMs = 0;
            const pollNumeric = Number(attachRendererOptions.promptPollIntervalMs);
            const resolvedPollInterval =
              Number.isFinite(pollNumeric) && pollNumeric > 0 ? pollNumeric : 75;
            attachRendererOptions.promptPollIntervalMs = Math.max(50, resolvedPollInterval);
          }

          const resolvedDeps = await resolveCooldownDependencies(store, {
            createRoundTimer: createRoundTimerFn,
            attachCooldownRenderer: attachCooldownRendererFn
          });

          await startRoundCooldown(resolvedDeps, {
            seconds: secs,
            delayOpponentMessage: delayOpponentMessageFlag,
            rendererOptions: attachRendererOptions,
            promptBudget,
            waitForDelayedOpponentPromptDisplay,
            getOpponentPromptTimestamp
          });
        }
      } catch {}
    }
  } finally {
    if (shouldCleanupDelayFlag) {
      try {
        delete store.__delayOpponentMessage;
      } catch {}
    }
  }
  try {
    if (typeof updateDebugPanelFn === "function") updateDebugPanelFn();
  } catch {}
}

// --- Event bindings ---

// --- Event Bindings ---

/**
 * Bind handler for `roundStarted` events.
 *
 * @pseudocode
 * 1. Listen for `roundStarted`.
 * 2. Extract store and round number.
 * 3. Invoke `applyRoundUI`.
 *
 * @returns {void}
 */
export function bindRoundStarted() {}

/**
 * Bind handler for `statSelected` events.
 *
 * @pseudocode
 * 1. Listen for `statSelected`.
 * 2. Delegate to `handleStatSelectedEvent`.
 *
 * @returns {void}
 */
export function bindStatSelected() {
  onBattleEvent("statSelected", (event) => {
    handleStatSelectedEvent(event);
  });
}

/**
 * Bind handler for `round.evaluated` events.
 *
 * @pseudocode
 * 1. Listen for `round.evaluated`.
 * 2. Surface outcome, update score, maybe show summary.
 * 3. Clear selection highlight and refresh debug panel.
 *
 * @returns {void}
 */
export function bindRoundResolved() {
  onBattleEvent("round.evaluated", (event) => {
    handleRoundResolvedEvent(event).catch(() => {});
  });
}

/**
 * Bind all round UI event handlers.
 *
 * @pseudocode
 * 1. Bind `roundStarted` handler.
 * 2. Bind `round.evaluated` handler.
 * Note: statSelected handler moved to dynamic bindings to prevent duplication.
 *
 * @returns {void}
 */
export function bindRoundUIEventHandlers() {
  bindRoundStarted();
  bindRoundResolved();
  onBattleEvent(EVENT_TYPES.STATE_TRANSITIONED, (event) => {
    const { source, to } = event?.detail || {};
    if (source !== "roundUI.applyRoundUI" || to !== "roundSelect") return;
    emitBattleEvent("statButtons:enable");
  });
  // Instrument statButtons enable/disable events to observe unexpected toggles
  try {
    const target = getBattleEventTarget();
    if (target && typeof target.addEventListener === "function") {
      target.addEventListener("statButtons:disable", () => {
        try {
          // console.log("INFO: event statButtons:disable observed");
        } catch {}
      });
      target.addEventListener("statButtons:enable", () => {
        try {
          // console.log("INFO: event statButtons:enable observed");
        } catch {}
      });
    }
  } catch {}
}

function shouldBindRoundUIHandlers(key) {
  let shouldBind = true;
  try {
    const target = getBattleEventTarget();
    if (target) {
      const set = (globalThis[key] ||= new WeakSet());
      if (set.has(target)) shouldBind = false;
      else set.add(target);
    }
  } catch {}
  return shouldBind;
}

/**
 * Bind round UI handlers once per battle event target.
 *
 * Guards against duplicate bindings across repeated module imports by tracking
 * the active battle event target in a WeakSet. When the same target is
 * encountered again the function exits early, mirroring the previous module-
 * level behavior without performing work eagerly on import.
 *
 * @pseudocode
 * 1. Optimistically schedule lazy UI service preload to match default path.
 * 2. Read the global WeakSet keyed by the battle event target.
 * 3. If the current target already exists in the set, skip binding.
 * 4. Otherwise add the target and invoke the shared binding routine.
 *
 * @returns {void}
 */
export function bindRoundUIEventHandlersOnce() {
  scheduleMatchSummaryPreload();
  if (shouldBindRoundUIHandlers("__cbRoundUIStaticBoundTargets")) {
    bindRoundUIEventHandlers();
  }
}

// Test-friendly variant: dynamically import dependencies within handlers so
// that vi.mock replacements are honored even when bindings occur before mocks.
/**
 * Bind dynamic event handlers that import dependencies at call time.
 *
 * Dynamically imports modules inside handlers so test-time mocks (vi.mock)
 * are honored. Guards against rebinding to the same EventTarget instance.
 *
 * @pseudocode
 * 1. On `statSelected` → add `selected` and disable buttons.
 * 2. On `round.start` → dismiss transient snackbars.
 *
 * @returns {void}
 */
export function bindRoundUIEventHandlersDynamic() {
  scheduleMatchSummaryPreload();
  if (!shouldBindRoundUIHandlers("__cbRoundUIDynamicBoundTargets")) {
    return;
  }
  // Contract: Always call __resetBattleEventTarget() before binding handlers to ensure clean state
  // Each EventTarget reset creates a fresh instance with no handlers attached
  onBattleEvent("round.start", async () => {
    // Dismiss countdown snackbar immediately when Next is clicked
    try {
      if (typeof dismissCountdownSnackbar === "function") {
        await dismissCountdownSnackbar();
      }
    } catch {
      // Non-critical
    }

    // Dismiss opponent snackbar immediately when Next is clicked
    try {
      const { dismissOpponentSnackbar } = await import("./uiEventHandlers.js");
      if (typeof dismissOpponentSnackbar === "function") {
        await dismissOpponentSnackbar();
      }
    } catch {
      // Non-critical
    }
  });
  onBattleEvent("statSelected", (event) => {
    try {
      document.body?.setAttribute?.("data-stat-selected", "true");
    } catch {}
    handleStatSelectedEvent(event);
  });
  onBattleEvent(EVENT_TYPES.STATE_TRANSITIONED, (event) => {
    const { source, to } = event?.detail || {};
    if (source !== "roundUI.applyRoundUI" || to !== "roundSelect") return;
    emitBattleEvent("statButtons:enable");
  });
}
