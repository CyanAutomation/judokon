import { updateDebugPanel } from "./debugPanel.js";
import { showSelectionPrompt } from "./snackbar.js";
// Use index re-exports so tests can vi.mock("../battle/index.js") and spy
import { resetStatButtons } from "../battle/index.js";
import { startTimer } from "./timerService.js";
import { handleStatSelectionTimeout } from "./autoSelectHandlers.js";

import * as scoreboard from "../setupScoreboard.js";
import { handleStatSelection } from "./selectionHandler.js";
import * as roundManagerModule from "./roundManager.js";
import { onBattleEvent, emitBattleEvent, getBattleEventTarget } from "./battleEvents.js";
import { getCardStatValue } from "./cardStatUtils.js";
import { getOpponentJudoka } from "./cardSelection.js";
import { showSnackbar, updateSnackbar as _updateSnackbar } from "../showSnackbar.js";
import { createRoundTimer as defaultCreateRoundTimer } from "../timers/createRoundTimer.js";
import { computeNextRoundCooldown } from "../timers/computeNextRoundCooldown.js";
import { attachCooldownRenderer as defaultAttachCooldownRenderer } from "../CooldownRenderer.js";
import { syncScoreDisplay } from "./uiHelpers.js";
import { enableStatButtons, disableStatButtons } from "../battle/index.js";
import { runWhenIdle } from "./idleCallback.js";
import { runAfterFrames } from "../../utils/rafUtils.js";
import { getOpponentPromptTimestamp } from "./opponentPromptTracker.js";
import {
  computeOpponentPromptWaitBudget,
  waitForDelayedOpponentPromptDisplay,
  DEFAULT_OPPONENT_PROMPT_BUFFER_MS as INTERNAL_DEFAULT_OPPONENT_PROMPT_BUFFER_MS
} from "./opponentPromptWaiter.js";

/**
 * @summary Safety buffer exported for backward compatibility with existing imports.
 * @pseudocode DEFAULT_OPPONENT_PROMPT_BUFFER_MS = 250
 */
export const DEFAULT_OPPONENT_PROMPT_BUFFER_MS = INTERNAL_DEFAULT_OPPONENT_PROMPT_BUFFER_MS;

const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;
let showMatchSummaryModal = null;
// Reference to avoid unused-import lint complaint when the function is re-exported
// or only used in other environments.
void _updateSnackbar;
let hasScheduledUiServicePreload = false;
function preloadUiService() {
  import("/src/helpers/classicBattle/uiService.js")
    .then((m) => {
      showMatchSummaryModal = m.showMatchSummaryModal;
    })
    .catch(() => {});
}

function collectStatButtons(store) {
  if (store && typeof store === "object" && store.statButtonEls) {
    try {
      return Object.values(store.statButtonEls).filter((btn) =>
        btn && typeof btn === "object" && typeof btn.classList !== "undefined"
      );
    } catch {}
  }
  try {
    if (typeof document?.querySelectorAll === "function") {
      return Array.from(document.querySelectorAll("#stat-buttons button[data-stat]"));
    }
  } catch {}
  return [];
}

function clearStatButtonSelections(store) {
  const buttons = collectStatButtons(store);
  buttons.forEach((btn) => {
    try {
      btn.classList.remove("selected");
      btn.style?.removeProperty?.("background-color");
    } catch {}
  });
}
function scheduleUiServicePreload() {
  if (hasScheduledUiServicePreload) return;
  hasScheduledUiServicePreload = true;
  try {
    runWhenIdle(preloadUiService);
  } catch {
    try {
      preloadUiService();
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
  void store;
  const timerFactory = selectTimerFactory(overrides?.createRoundTimer);
  const renderer = selectRendererFactory(overrides?.attachCooldownRenderer);

  return {
    timer: instantiateTimer(timerFactory),
    renderer
  };
}

function selectTimerFactory(override) {
  if (typeof override === "function") {
    return override;
  }
  return typeof defaultCreateRoundTimer === "function" ? defaultCreateRoundTimer : null;
}

function selectRendererFactory(override) {
  if (typeof override === "function") {
    return override;
  }
  return typeof defaultAttachCooldownRenderer === "function" ? defaultAttachCooldownRenderer : null;
}

function instantiateTimer(factory) {
  if (typeof factory !== "function") {
    return null;
  }
  try {
    return factory();
  } catch {
    // Silently handle factory failures to maintain UI responsiveness
  }
  return null;
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

  attachRendererSafely(renderer, timer, seconds, rendererOptions);

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
    if (!IS_VITEST)
      console.debug(`classicBattle.trace cooldown:start t=${Date.now()} secs=${seconds}`);
  } catch {}
  await startTimerSafely(timer, seconds);
  try {
    if (!IS_VITEST)
      console.debug(`classicBattle.trace cooldown:end t=${Date.now()} secs=${seconds}`);
  } catch {}
  try {
    const target = getBattleEventTarget?.();
    if (target && typeof target.addEventListener === "function") {
      let started = false;
      const onStart = () => {
        started = true;
        target.removeEventListener("roundStarted", onStart);
        try {
          if (!IS_VITEST)
            console.debug(`classicBattle.trace cooldown:observedRoundStarted t=${Date.now()}`);
        } catch {}
      };
      target.addEventListener("roundStarted", onStart);
      // After a short post-cooldown buffer, check if round started; if not, recover.
      setTimeout(
        () => {
          try {
            if (!started) {
              try {
                if (!IS_VITEST)
                  console.debug(`classicBattle.trace cooldown:recoveryResetUI t=${Date.now()}`);
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

function normalizeRendererOptions(options) {
  if (options && typeof options === "object") {
    return options;
  }
  return {};
}

function attachRendererSafely(renderer, timer, seconds, options) {
  if (typeof renderer !== "function") {
    return;
  }
  try {
    renderer(timer, seconds, options);
  } catch {}
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

function resolveOpponentPromptBuffer(cooldownResult, rendererOptions) {
  const optionsBuffer = Number(rendererOptions?.opponentPromptBufferMs);
  if (Number.isFinite(optionsBuffer) && optionsBuffer >= 0) {
    return optionsBuffer;
  }
  if (cooldownResult && typeof cooldownResult === "object") {
    const resultBuffer = Number(cooldownResult.opponentPromptBufferMs);
    if (Number.isFinite(resultBuffer) && resultBuffer >= 0) {
      return resultBuffer;
    }
  }
  return undefined;
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
 * 2. Sync the scoreboard and update the round counter.
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
export function applyRoundUI(store, roundNumber, stallTimeoutMs = 5000) {
  try {
    if (!IS_VITEST) console.log("INFO: applyRoundUI called for round", roundNumber);
  } catch {}
  resetStatButtons();
  try {
    if (!IS_VITEST)
      console.log(
        "INFO: applyRoundUI -> requested resetStatButtons (will re-enable on next frame)"
      );
  } catch {}
  // Do not force-disable the Next button here; it should remain
  // ready after cooldown so tests and users can advance immediately.
  const roundResultEl = document.getElementById("round-result");
  if (roundResultEl) roundResultEl.textContent = "";
  try {
    syncScoreDisplay();
  } catch {}
  scoreboard.updateRoundCounter(roundNumber);
  showSelectionPrompt();
  const playerCard =
    store.playerCardEl || (store.playerCardEl = document.getElementById("player-card"));
  const opponentCard =
    store.opponentCardEl || (store.opponentCardEl = document.getElementById("opponent-card"));
  if (!store.statButtonEls) {
    store.statButtonEls = Array.from(
      document.querySelectorAll("#stat-buttons button[data-stat]")
    ).reduce((acc, btn) => {
      const s = btn.dataset.stat;
      if (s) acc[s] = btn;
      return acc;
    }, {});
  }
  startTimer((stat, opts) => {
    const playerVal = getCardStatValue(playerCard, stat);
    let opponentVal = getCardStatValue(opponentCard, stat);
    try {
      const opp = getOpponentJudoka();
      const raw = opp && opp.stats ? Number(opp.stats[stat]) : NaN;
      opponentVal = Number.isFinite(raw) ? raw : opponentVal;
    } catch {}
    return handleStatSelection(store, stat, { playerVal, opponentVal, ...opts });
  }, store);
  store.stallTimeoutMs = stallTimeoutMs;
  // Schedule stall prompt and optional auto-select using the unified helper
  // without double-wrapping the timeout. The helper manages its own timer
  // and records `store.autoSelectId` for later cancellation.
  handleStatSelectionTimeout(
    store,
    (s, opts) => {
      const playerVal = getCardStatValue(playerCard, s);
      let opponentVal = getCardStatValue(opponentCard, s);
      try {
        const opp = getOpponentJudoka();
        const raw = opp && opp.stats ? Number(opp.stats[s]) : NaN;
        opponentVal = Number.isFinite(raw) ? raw : opponentVal;
      } catch {}
      return handleStatSelection(store, s, { playerVal, opponentVal, ...opts });
    },
    store.stallTimeoutMs
  );
  updateDebugPanel();
  // Ensure buttons end up enabled at the tail of round UI setup
  try {
    enableStatButtons?.();
    emitBattleEvent("statButtons:enable");
    if (!IS_VITEST) console.log("INFO: applyRoundUI -> ensured stat buttons enabled (tail)");
  } catch {}
}

/**
 * Handle a `roundStarted` battle event.
 *
 * @param {CustomEvent} event
 * @param {{ applyRoundUI?: typeof applyRoundUI }} [deps]
 * @pseudocode
 * 1. Read `store` and `roundNumber` from the event detail.
 * 2. When both are valid, call the injected `applyRoundUI` implementation.
 * @returns {void}
 */
export function handleRoundStartedEvent(event, deps = {}) {
  const { applyRoundUI: applyRoundUiFn = applyRoundUI } = deps;
  const { store, roundNumber } = event?.detail || {};
  try {
    if (!IS_VITEST)
      console.debug(`classicBattle.trace event:roundStarted t=${Date.now()} round=${roundNumber}`);
  } catch {}
  if (store && typeof roundNumber === "number") {
    applyRoundUiFn(store, roundNumber);
    // Final guard to ensure buttons are interactive at round start
    try {
      enableStatButtons?.();
      emitBattleEvent("statButtons:enable");
      if (!IS_VITEST) console.log("INFO: handleRoundStartedEvent -> ensured stat buttons enabled");
    } catch {}
  }
}

/**
 * Handle a `statSelected` battle event.
 *
 * @param {CustomEvent} event
 * @param {{ showSnackbar?: (message: string) => void }} [deps]
 * @pseudocode
 * 1. Pull `stat`, `store`, and `opts` from the event detail and bail when missing.
 * 2. Add the `selected` class to the chosen button and show snackbar feedback when allowed.
 * 3. Emit `statButtons:disable` to lock the stat buttons after selection.
 * @returns {void}
 */
export function handleStatSelectedEvent(event, deps = {}) {
  const { showSnackbar: showSnackbarFn = showSnackbar } = deps;
  try {
    if (!IS_VITEST) console.debug(`classicBattle.trace event:statSelected t=${Date.now()}`);
  } catch {}
  const { stat, store, opts } = event?.detail || {};
  if (!stat || !store || !store.statButtonEls) return;
  const btn = store.statButtonEls[stat];
  if (btn) {
    try {
      if (!IS_VITEST)
        console.warn(`[test] addSelected: stat=${stat} label=${(btn.textContent || "").trim()}`);
    } catch {}
    btn.classList.add("selected");
    if (!opts || !opts.delayOpponentMessage) {
      try {
        if (typeof showSnackbarFn === "function") {
          showSnackbarFn(`You Picked: ${btn.textContent}`);
        }
      } catch {}
    }
  }
  try {
    disableStatButtons?.();
  } catch {}
  emitBattleEvent("statButtons:disable");
}

/**
 * Handle a `roundResolved` battle event.
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
 * 2. Surface the outcome message and update the score using the injected scoreboard API.
 * 3. When the match ends, clear the round counter, show the summary modal, and emit `matchOver`.
 * 4. Otherwise, compute the next-round cooldown and, if not orchestrated, configure and start the timer with injected helpers.
 * 5. Clear stat button visuals without re-enabling them and refresh the debug panel.
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
  const { store, result } = event?.detail || {};
  if (!result) return;
  try {
    if (!IS_VITEST) console.debug(`classicBattle.trace event:roundResolved t=${Date.now()}`);
  } catch {}
  try {
    scoreboardApi?.showMessage?.(result.message || "", { outcome: true });
  } catch {}
  try {
    if (typeof scoreboardApi?.updateScore === "function") {
      scoreboardApi.updateScore(result.playerScore, result.opponentScore);
    } else if (typeof syncScoreDisplayFn === "function") {
      syncScoreDisplayFn();
    }
  } catch {}
  const runReset = () => {
    clearStatButtonSelections(store);
    try {
      disableStatButtons?.();
    } catch {}
    try {
      emitBattleEvent("statButtons:disable");
    } catch {}
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
  // Proactively enable stat buttons on resolution to prevent deadlock,
  // UI will disable them again on selection in the next round.
  try {
    enableStatButtons?.();
    emitBattleEvent("statButtons:enable");
  } catch {}
  const shouldCleanupDelayFlag = !!(store && typeof store === "object");
  try {
    if (result.matchEnded) {
      try {
        scoreboardApi?.clearRoundCounter?.();
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
export function bindRoundStarted() {
  onBattleEvent("roundStarted", (event) => {
    handleRoundStartedEvent(event);
  });
}

/**
 * Bind handler for `statSelected` events.
 *
 * @pseudocode
 * 1. Listen for `statSelected`.
 * 2. Highlight the chosen button and optionally show feedback.
 * 3. Disable further stat selections.
 *
 * @returns {void}
 */
export function bindStatSelected() {
  onBattleEvent("statSelected", (event) => {
    handleStatSelectedEvent(event);
  });
}

/**
 * Bind handler for `roundResolved` events.
 *
 * @pseudocode
 * 1. Listen for `roundResolved`.
 * 2. Surface outcome, update score, maybe show summary.
 * 3. Clear selection highlight and refresh debug panel.
 *
 * @returns {void}
 */
export function bindRoundResolved() {
  onBattleEvent("roundResolved", (event) => {
    handleRoundResolvedEvent(event).catch(() => {});
  });
}

/**
 * Bind all round UI event handlers.
 *
 * @pseudocode
 * 1. Bind `roundStarted` handler.
 * 2. Bind `statSelected` handler.
 * 3. Bind `roundResolved` handler.
 *
 * @returns {void}
 */
export function bindRoundUIEventHandlers() {
  bindRoundStarted();
  bindStatSelected();
  bindRoundResolved();
  // Instrument statButtons enable/disable events to observe unexpected toggles
  try {
    const target = getBattleEventTarget();
    if (target && typeof target.addEventListener === "function") {
      target.addEventListener("statButtons:disable", () => {
        try {
          if (!IS_VITEST) console.log("INFO: event statButtons:disable observed");
        } catch {}
      });
      target.addEventListener("statButtons:enable", () => {
        try {
          if (!IS_VITEST) console.log("INFO: event statButtons:enable observed");
        } catch {}
      });
    }
  } catch {}
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
  scheduleUiServicePreload();
  let shouldBind = true;
  try {
    const KEY = "__cbRoundUIStaticBoundTargets";
    const target = getBattleEventTarget();
    if (target) {
      const set = (globalThis[KEY] ||= new WeakSet());
      if (set.has(target)) shouldBind = false;
      else set.add(target);
    }
  } catch {}
  if (shouldBind) {
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
 * 1. Track the current EventTarget in a WeakSet; bail if already bound.
 * 2. On `roundStarted` → call `applyRoundUI(store, roundNumber)`.
 * 3. On `statSelected` → add `selected`, show “You Picked…”, and disable buttons.
 * 4. On `roundResolved` → show outcome, update score, surface countdown text, schedule failsafes, clear selection, update debug panel.
 *
 * @returns {void}
 */
export function bindRoundUIEventHandlersDynamic() {
  scheduleUiServicePreload();
  // Guard against rebinding on the same EventTarget instance
  try {
    const KEY = "__cbRoundUIDynamicBoundTargets";
    const target = getBattleEventTarget();
    const set = (globalThis[KEY] ||= new WeakSet());
    if (set.has(target)) return;
    set.add(target);
  } catch {}
  const createPreloader = (loader) => {
    const promise = Promise.resolve()
      .then(loader)
      .catch(() => undefined);
    return () => promise;
  };
  const loadScoreboard = createPreloader(() => import("../setupScoreboard.js"));
  const loadShowSnackbar = createPreloader(() => import("../showSnackbar.js"));
  const loadComputeNextRoundCooldown = createPreloader(
    () => import("../timers/computeNextRoundCooldown.js")
  );
  const loadRoundManager = createPreloader(
    () => import("/src/helpers/classicBattle/roundManager.js")
  );
  const loadCooldownRenderer = createPreloader(() => import("../CooldownRenderer.js"));
  const loadCreateRoundTimer = createPreloader(() => import("../timers/createRoundTimer.js"));
  const loadUiHelpers = createPreloader(() => import("/src/helpers/classicBattle/uiHelpers.js"));
  onBattleEvent("roundStarted", (event) => {
    handleRoundStartedEvent(event);
  });
  onBattleEvent("statSelected", async (event) => {
    const module = await loadShowSnackbar();
    try {
      document.body?.setAttribute?.("data-stat-selected", "true");
    } catch {}
    handleStatSelectedEvent(event, { showSnackbar: module?.showSnackbar });
  });
  onBattleEvent("roundResolved", async (event) => {
    const [
      scoreboardModule,
      roundManagerModule,
      cooldownModule,
      timerModule,
      rendererModule,
      uiHelpersModule
    ] = await Promise.all([
      loadScoreboard(),
      loadRoundManager(),
      loadComputeNextRoundCooldown(),
      loadCreateRoundTimer(),
      loadCooldownRenderer(),
      loadUiHelpers()
    ]);
    await handleRoundResolvedEvent(event, {
      scoreboard: scoreboardModule || scoreboard,
      showMatchSummary: showMatchSummaryModal,
      handleReplay: roundManagerModule?.handleReplay,
      isOrchestrated: roundManagerModule?.isOrchestrated,
      computeNextRoundCooldown: cooldownModule?.computeNextRoundCooldown,
      createRoundTimer: timerModule?.createRoundTimer,
      attachCooldownRenderer: rendererModule?.attachCooldownRenderer,
      resetStatButtons,
      syncScoreDisplay,
      updateDebugPanel: uiHelpersModule?.updateDebugPanel
    });
  });
}
