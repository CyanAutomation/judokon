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
import { computeNextRoundCooldown } from "../timers/computeNextRoundCooldown.js";
import { syncScoreDisplay } from "./uiHelpers.js";
import { runWhenIdle } from "./idleCallback.js";
import { runAfterFrames } from "../../utils/rafUtils.js";
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
  if (store && typeof roundNumber === "number") {
    applyRoundUiFn(store, roundNumber);
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
    if (!IS_VITEST) console.log("INFO: statSelected event handler");
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
 * @param {typeof resetStatButtons} [deps.resetStatButtons]
 * @param {typeof syncScoreDisplay} [deps.syncScoreDisplay]
 * @param {typeof updateDebugPanel} [deps.updateDebugPanel]
 * @pseudocode
 * 1. Exit early when the event lacks a round result.
 * 2. Surface the outcome message and update the score using the injected scoreboard API.
 * 3. When the match ends, clear the round counter, show the summary modal, and emit `matchOver`.
 * 4. Otherwise, compute the next-round cooldown and, if not orchestrated, configure and start the timer with injected helpers.
 * 5. Reset stat buttons on the next paint tick and refresh the debug panel.
 * @returns {Promise<void>}
 */
export async function handleRoundResolvedEvent(event, deps = {}) {
  const {
    scoreboard: scoreboardApi = scoreboard,
    showMatchSummary = showMatchSummaryModal,
    computeNextRoundCooldown: computeNextRoundCooldownFn = computeNextRoundCooldown,
    createRoundTimer: createRoundTimerFn,
    attachCooldownRenderer: attachCooldownRendererFn,
    resetStatButtons: resetStatButtonsFn = resetStatButtons,
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
    if (!IS_VITEST) console.warn("[test] roundResolved event received");
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
    try {
      if (typeof resetStatButtonsFn === "function") resetStatButtonsFn();
    } catch {}
  };
  let didReset = false;
  const runResetOnce = () => {
    if (didReset) return;
    didReset = true;
    runReset();
  };
  let usedFrames = false;
  try {
    runAfterFrames(2, runResetOnce);
    usedFrames = true;
  } catch {
    usedFrames = false;
  }
  if (typeof setTimeout === "function") {
    setTimeout(runResetOnce, 32);
  } else if (!usedFrames) {
    runResetOnce();
  }
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
        const computeCooldown =
          typeof computeNextRoundCooldownFn === "function"
            ? computeNextRoundCooldownFn
            : computeNextRoundCooldown;
        const secs = Math.max(3, Number(computeCooldown()));
        let timerFactory =
          typeof createRoundTimerFn === "function" ? createRoundTimerFn : undefined;
        let renderer =
          typeof attachCooldownRendererFn === "function" ? attachCooldownRendererFn : undefined;
        if (!timerFactory || !renderer) {
          try {
            const [timerMod, rendererMod] = await Promise.all([
              timerFactory
                ? Promise.resolve({ createRoundTimer: timerFactory })
                : import("../timers/createRoundTimer.js"),
              renderer
                ? Promise.resolve({ attachCooldownRenderer: renderer })
                : import("../CooldownRenderer.js")
            ]);
            timerFactory = timerFactory || timerMod.createRoundTimer;
            renderer = renderer || rendererMod.attachCooldownRenderer;
          } catch {}
        }
        const timer = typeof timerFactory === "function" ? timerFactory() : null;
        if (timer) {
          try {
            if (typeof renderer === "function") {
              renderer(timer, secs);
            }
          } catch {}
          try {
            if (typeof timer.start === "function") {
              timer.start(secs);
            }
          } catch {}
        }
      }
    } catch {}
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
}

/**
 * Bind round UI handlers once per battle event target.
 *
 * Guards against duplicate bindings across repeated module imports by tracking
 * the active battle event target in a WeakSet. When the same target is
 * encountered again the function exits early, mirroring the previous module-
 * level behavior without performing work eagerly on import.
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
