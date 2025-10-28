import { drawCards, _resetForTest as resetSelection } from "./cardSelection.js";
import { createBattleEngine } from "../battleEngineFacade.js";
import * as battleEngine from "../battleEngineFacade.js";
import { bridgeEngineEvents } from "./engineBridge.js";
import { cancel as cancelFrame, stop as stopScheduler } from "../../utils/scheduler.js";
import { resetSkipState, setSkipHandler } from "./skipHandler.js";
import { emitBattleEvent } from "./battleEvents.js";
import { roundStore } from "./roundStore.js";
import { readDebugState, exposeDebugState } from "./debugHooks.js";
import { writeScoreDisplay, syncScoreboardDisplay } from "./scoreDisplay.js";
import * as scoreboard from "../setupScoreboard.js";
import logger from "../logger.js";
import { dispatchBattleEvent } from "./eventDispatcher.js";
import { computeNextRoundCooldown } from "../timers/computeNextRoundCooldown.js";
import { isTestModeEnabled } from "../testModeUtils.js";
import { getStateSnapshot } from "./battleDebug.js";
import { createEventBus } from "./eventBusUtils.js";
import { getDebugPanelLazy } from "./preloadService.js";
import { setNextButtonFinalizedState } from "./uiHelpers.js";
import {
  createExpirationTelemetryEmitter,
  createMachineReader,
  createMachineStateInspector,
  dispatchReadyDirectly,
  dispatchReadyViaBus,
  dispatchReadyWithOptions,
  runReadyDispatchStrategies,
  updateExpirationUi
} from "./nextRound/expirationHandlers.js";
import {
  appendReadyTrace,
  createCooldownControls,
  createExpirationDispatcher,
  detectOrchestratorContext,
  getMachineState,
  initializeCooldownTelemetry,
  instantiateCooldownTimer,
  isOrchestratorReadyState,
  markNextReady,
  registerSkipHandlerForTimer,
  resolveActiveScheduler,
  resolveReadinessTarget,
  safeRound,
  scheduleCooldownFallbacks,
  setupNonOrchestratedReady,
  setupOrchestratedReady,
  startTimerWithDiagnostics
} from "./cooldownOrchestrator.js";
import { createNextRoundSession } from "./nextRound/session.js";
import {
  hasReadyBeenDispatchedForCurrentCooldown,
  resetReadyDispatchState,
  setReadyDispatchedForCurrentCooldown
} from "./roundReadyState.js";
import { showSnackbar } from "../showSnackbar.js";
import { t } from "../i18n.js";
import { OPPONENT_PLACEHOLDER_ID } from "./opponentPlaceholder.js";

const READY_DISPATCHER_IDENTITY_SYMBOL =
  typeof Symbol === "function"
    ? Symbol.for("classicBattle.readyDispatcherIdentity")
    : "__classicBattle_readyDispatcherIdentity__";

const hasOwn = Object.prototype.hasOwnProperty;
const ROUND_START_GUARD = Symbol.for("classicBattle.startRoundGuard");
const ACTIVE_ROUND_PAYLOAD = Symbol.for("classicBattle.activeRoundPayload");
const ROUND_RESOLUTION_GUARD = Symbol.for("classicBattle.roundResolutionGuard");
const LAST_ROUND_RESULT = Symbol.for("classicBattle.lastResolvedRoundResult");

function enterStoreGuard(store, token) {
  if (!store || typeof store !== "object") {
    return { entered: true, release() {} };
  }
  if (hasOwn.call(store, token)) {
    return { entered: false, release() {} };
  }
  Object.defineProperty(store, token, {
    configurable: true,
    enumerable: false,
    writable: true,
    value: true
  });
  return {
    entered: true,
    release() {
      try {
        delete store[token];
      } catch (error) {
        // Cleanup is best-effort; ignore deletion errors.
        void error;
      }
    }
  };
}

function getHiddenStoreValue(store, token) {
  if (!store || typeof store !== "object") return undefined;
  return store[token];
}

function setHiddenStoreValue(store, token, value) {
  if (!store || typeof store !== "object") {
    return;
  }
  if (hasOwn.call(store, token)) {
    store[token] = value;
    return;
  }
  Object.defineProperty(store, token, {
    configurable: true,
    enumerable: false,
    writable: true,
    value
  });
}

/**
 * @summary Get the opponent card container element from the DOM.
 * @returns {HTMLElement|null} The opponent card container or null if not found.
 */
function getOpponentCardContainer() {
  if (typeof document === "undefined") return null;
  try {
    return document.getElementById("opponent-card");
  } catch {
    return null;
  }
}

/**
 * @summary Determine whether the container currently holds a rendered opponent card.
 * @param {HTMLElement|null} container - The container to inspect.
 * @returns {boolean} True when a real opponent card is present.
 */
function hasRealOpponentCard(container) {
  if (!container || typeof container.querySelector !== "function") return false;
  try {
    return !!container.querySelector(".judoka-card");
  } catch {
    return false;
  }
}

/**
 * @summary Determine whether the container has an opponent placeholder element.
 * @param {HTMLElement|null} container - The container to inspect.
 * @returns {boolean} True when a placeholder element exists.
 */
function hasOpponentPlaceholder(container) {
  if (!container || typeof container.querySelector !== "function") return false;
  try {
    return !!container.querySelector(`#${OPPONENT_PLACEHOLDER_ID}`);
  } catch {
    return false;
  }
}

/**
 * @summary Hide the opponent container when a real opponent card is visible.
 * @param {HTMLElement|null} container - The container to potentially hide.
 * @returns {HTMLElement|null} The container reference for chaining.
 */
function hideOpponentCardIfRealVisible(container) {
  if (!container) return null;
  if (hasRealOpponentCard(container)) {
    try {
      container.classList.add("opponent-hidden");
    } catch {}
    return container;
  }
  try {
    container.classList.remove("opponent-hidden");
  } catch {}
  return container;
}

/**
 * @summary Ensure the opponent placeholder remains visible when no real card is rendered.
 * @param {HTMLElement|null} container - The container whose visibility should be adjusted.
 */
function ensureOpponentPlaceholderVisibility(container) {
  if (!container) return;
  if (hasOpponentPlaceholder(container) && !hasRealOpponentCard(container)) {
    try {
      container.classList.remove("opponent-hidden");
    } catch {}
  }
}

function readReadyDispatcherSignature(candidate) {
  if (typeof candidate !== "function") return undefined;
  const identitySymbol = READY_DISPATCHER_IDENTITY_SYMBOL;
  const symbolValue = identitySymbol ? candidate[identitySymbol] : undefined;
  if (typeof symbolValue === "string" || typeof symbolValue === "number") {
    return String(symbolValue);
  }
  if (typeof candidate.readyDispatcherId === "string" && candidate.readyDispatcherId) {
    return candidate.readyDispatcherId;
  }
  if (typeof candidate.dispatcherId === "string" && candidate.dispatcherId) {
    return candidate.dispatcherId;
  }
  return undefined;
}

// Lazy-loaded debug panel updater
let lazyUpdateDebugPanel = null;
async function getLazyUpdateDebugPanel() {
  if (!lazyUpdateDebugPanel) {
    const debugPanel = await getDebugPanelLazy();
    lazyUpdateDebugPanel = debugPanel.updateDebugPanel;
  }
  return lazyUpdateDebugPanel;
}

/**
 * @summary Construct the state container used by classic battle round orchestration helpers.
 *
 * @pseudocode
 * 1. Initialize battle state values with default placeholders.
 * 2. Return the populated store object.
 *
 * @returns {object} The battle state store.
 */
export function createBattleStore() {
  return {
    selectionMade: false,
    stallTimeoutMs: 35000,
    autoSelectId: null,
    playerChoice: null,
    playerCardEl: null,
    opponentCardEl: null,
    statButtonEls: null,
    currentPlayerJudoka: null,
    currentOpponentJudoka: null,
    lastPlayerStats: null,
    lastOpponentStats: null
  };
}

function persistLastJudokaStats(store, playerJudoka, opponentJudoka) {
  if (!store || typeof store !== "object") {
    return;
  }

  if (playerJudoka?.stats && typeof playerJudoka.stats === "object") {
    store.lastPlayerStats = { ...playerJudoka.stats };
  }

  if (opponentJudoka?.stats && typeof opponentJudoka.stats === "object") {
    store.lastOpponentStats = { ...opponentJudoka.stats };
  }
}

/**
 * @summary Detect whether the classic battle orchestrator is active.
 *
 * This checks for the presence of `data-battle-state` on the document body
 * which is set when the state machine is initialized.
 *
 * @returns {boolean} True when orchestration appears active.
 */

function getStartRound(store) {
  const api = readDebugState("classicBattleDebugAPI");
  if (api?.startRoundOverride) return api.startRoundOverride;
  return () => startRound(store);
}

/**
 * Restart the current match by resetting engine state and UI then starting a round.
 *
 * This helper is used by the UI's 'replay' flow to clear engine state, notify
 * the UI to reset, and delegate to `startRound()` (which may be overridden in
 * test debug APIs).
 *
 * @summary Reset match state and UI, then begin a new round.
 *
 * @pseudocode
 * 1. Reset the battle engine via `resetBattleEnginePreservingConfig()` (falling back to `createBattleEngine()` when unavailable) and then rebind events with `bridgeEngineEvents()`.
 * 2. Dispatch `game:reset-ui` and zero the scoreboard so UI surfaces show a fresh match state.
 * 3. Resolve the `startRound` implementation (allowing debug overrides), await its result, then reaffirm zeroed scores before returning.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @returns {Promise<ReturnType<typeof startRound>>} Result of starting a fresh round.
 */
export async function handleReplay(store) {
  persistLastJudokaStats(store, store?.currentPlayerJudoka, store?.currentOpponentJudoka);

  const resetEngine = () => {
    try {
      if (typeof battleEngine.resetBattleEnginePreservingConfig === "function") {
        battleEngine.resetBattleEnginePreservingConfig();
        return;
      }
    } catch (error) {
      try {
        logger.warn("resetBattleEnginePreservingConfig failed, using fallback", error);
      } catch {
        // Ignore logging errors to ensure fallback execution proceeds.
      }
    }

    createBattleEngine({ forceCreate: true });
  };

  safeRound("handleReplay.resetEngine", resetEngine, { suppressInProduction: true });

  bridgeEngineEvents();

  const applyZeroScores = () => {
    syncScoreboardDisplay(0, 0);
  };

  safeRound(
    "handleReplay.dispatchResetEvent",
    () => {
      if (typeof window === "undefined") {
        return;
      }

      window.dispatchEvent(new CustomEvent("game:reset-ui", { detail: { store } }));
    },
    { suppressInProduction: true }
  );

  safeRound(
    "handleReplay.emitScoreReset",
    () => emitBattleEvent("display.score.update", { player: 0, opponent: 0 }),
    { suppressInProduction: true }
  );

  safeRound("handleReplay.resetScoreboard", applyZeroScores, { suppressInProduction: true });

  safeRound(
    "handleReplay.resetRoundStoreNumber",
    () => roundStore.setRoundNumber(0, { emitLegacyEvent: false }),
    { suppressInProduction: true }
  );

  const startRoundFn = getStartRound(store);
  const result = await startRoundFn();

  safeRound("handleReplay.reapplyScoreboardReset", applyZeroScores, { suppressInProduction: true });

  return result;
}

/**
 * @summary Prepare and announce the next battle round.
 *
 * @pseudocode
 * 1. Clear selection state on the store to prepare for a new choice.
 * 2. Await `drawCards()` to populate round card data and persist the active player judoka.
 * 3. Derive the upcoming round number from the battle engine, falling back to one when unavailable.
 * 4. Invoke the optional `onRoundStart` callback and emit the `roundStarted` battle event with metadata.
 * 5. Store any provided scheduler reference for downstream helpers and return the drawn card payload with the round number.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store to mutate with round data.
 * @param {(store: ReturnType<typeof createBattleStore>, roundNumber: number) => void} [onRoundStart] - Callback invoked once the round is ready.
 * @returns {Promise<ReturnType<typeof drawCards> & { roundNumber: number }>} Drawn card data augmented with the round number.
 */
export async function startRound(store, onRoundStart) {
  const guard = enterStoreGuard(store, ROUND_START_GUARD);
  if (!guard.entered) {
    const cached = getHiddenStoreValue(store, ACTIVE_ROUND_PAYLOAD);
    return cached ?? null;
  }

  try {
    store.selectionMade = false;
    store.__lastSelectionMade = false;
    store.playerChoice = null;
    try {
      if (typeof window !== "undefined") {
        window.__classicBattleSelectionFinalized = false;
        window.__classicBattleLastFinalizeContext = null;
      }
    } catch {
      // Intentionally ignore window global availability errors when resetting selection metadata.
    }
    // Hide opponent card at start of round to prevent premature reveal when a real card is present
    const opponentContainer = hideOpponentCardIfRealVisible(getOpponentCardContainer());
    // Propagate scheduler from store.context if present
    const scheduler = store?.context?.scheduler || store?.scheduler;
    const cards = await drawCards();
    const activeContainer =
      opponentContainer && opponentContainer.isConnected
        ? opponentContainer
        : getOpponentCardContainer(); // Fallback if element was disconnected during async operations
    ensureOpponentPlaceholderVisibility(activeContainer);
    store.currentPlayerJudoka = cards.playerJudoka || null;
    store.currentOpponentJudoka = cards.opponentJudoka || null;
    persistLastJudokaStats(store, cards.playerJudoka, cards.opponentJudoka);
    safeRound(
      "startRound.syncScoreDisplay",
      () => {
        const scores =
          typeof battleEngine.getScores === "function" ? battleEngine.getScores() : null;
        if (!scores || typeof scores !== "object") {
          writeScoreDisplay(0, 0);
          return;
        }
        const rawPlayer =
          typeof scores.playerScore !== "undefined" ? scores.playerScore : scores.player;
        const rawOpponent =
          typeof scores.opponentScore !== "undefined" ? scores.opponentScore : scores.opponent;
        syncScoreboardDisplay(rawPlayer, rawOpponent);
      },
      { suppressInProduction: true }
    );
    let roundNumber = 1;
    safeRound(
      "startRound.resolveRoundNumber",
      () => {
        const fn = battleEngine.getRoundsPlayed;
        const played = typeof fn === "function" ? Number(fn()) : 0;
        if (Number.isFinite(played)) roundNumber = played + 1;
        try {
          if (typeof window !== "undefined") {
            const rounds = Array.isArray(window.__roundNumbers) ? window.__roundNumbers : [];
            rounds.push({ played, roundNumber, at: Date.now() });
            window.__roundNumbers = rounds;
          }
        } catch {
          // Ignore telemetry aggregation failures; round start flow should continue.
        }
      },
      { suppressInProduction: true }
    );
    if (typeof onRoundStart === "function") {
      safeRound("startRound.onRoundStart", () => onRoundStart(store, roundNumber), {
        suppressInProduction: true
      });
    }
    try {
      if (typeof console !== "undefined" && !process?.env?.VITEST)
        console.debug(`classicBattle.trace emit:roundStarted t=${Date.now()} round=${roundNumber}`);
    } catch {
      /* ignore logging errors to preserve round start flow */
    }
    emitBattleEvent("roundStarted", { store, roundNumber });
    // Synchronise centralized store
    try {
      try {
        roundStore.setRoundNumber(roundNumber);
      } catch {
        /* keep behaviour stable on failure */
      }
      try {
        roundStore.setRoundState("roundStart", "startRound");
      } catch {
        /* ignore */
      }
    } catch {
      /* defensive: featureFlags may not be initialised in some test harnesses */
    }
    // Attach scheduler to store for downstream use
    if (scheduler) store.scheduler = scheduler;
    const payload = { ...cards, roundNumber };
    try {
      delete store[LAST_ROUND_RESULT];
    } catch (error) {
      // Hidden store housekeeping failures should not interrupt round start.
      void error;
    }
    setHiddenStoreValue(store, ACTIVE_ROUND_PAYLOAD, payload);
    return payload;
  } finally {
    guard.release();
  }
}

/**
 * Store controls for the pending cooldown to the next round.
 * @type {{timer: ReturnType<typeof createRoundTimer>|null, resolveReady: (()=>void)|null, ready: Promise<void>|null}|null}
 */
let currentNextRound = null;

/**
 * Dispatch the cooldown "ready" event through available event bus dispatchers.
 *
 * Prioritizes an injected dispatcher when present so orchestrated environments
 * can observe the event before falling back to the global dispatcher. Treats a
 * resolved value of `false` as an explicit refusal so direct dispatch fallback
 * can proceed when orchestration declines the event.
 *
 * @param {object} [options={}] - Possible override hooks for dispatching
 * @param {Function} [options.dispatchBattleEvent] - Injected dispatcher helper
 * @returns {Promise<boolean>} True when any dispatcher handles the event
 * @pseudocode
 * 1. Collect injected dispatcher then the global dispatcher when distinct.
 * 2. Invoke each dispatcher with the "ready" event and await any promise.
 * 3. Treat a resolved value of `false` as failure; otherwise report success.
 * 4. Return false if every dispatcher declines or throws.
 */
/**
 * @summary Schedule the cooldown before the next round and expose controls for the Next button.
 * @summary Schedule the cooldown before the next round and expose controls for the Next button.
 *
 * @pseudocode
 * 1. Reset readiness tracking, determine the active scheduler, and capture orchestration context for telemetry.
 * 2. Build the event bus and cooldown controls, wiring DOM readiness handlers when the UI is not orchestrated.
 * 3. Compute the cooldown duration, emit countdown events, and configure helpers and timers for orchestrated or default flows.
 * 4. Persist the resulting controls for later retrieval and surface them through debug state before returning.
 * @pseudocode
 * 1. Reset readiness tracking, determine the active scheduler, and capture orchestration context for telemetry.
 * 2. Build the event bus and cooldown controls, wiring DOM readiness handlers when the UI is not orchestrated.
 * 3. Compute the cooldown duration, emit countdown events, and configure helpers and timers for orchestrated or default flows.
 * 4. Persist the resulting controls for later retrieval and surface them through debug state before returning.
 *
 * @param {ReturnType<typeof createBattleStore>} _store - Battle state store.
 * @param {typeof realScheduler} [scheduler=realScheduler] - Scheduler for timers.
 * @returns {{timer: ReturnType<typeof createRoundTimer>|null, resolveReady: (()=>void)|null, ready: Promise<void>|null}}
 * @pseudocode
 * 1. Reset cooldown diagnostics and build event bus/controls.
 * 2. Wire orchestrated or standard ready handlers based on context.
 * 3. Start timers, expose debug state, and return the cooldown controls.
 */
export function startCooldown(_store, scheduler, overrides = {}) {
  resetReadyDispatchState();
  const activeScheduler = resolveActiveScheduler(scheduler);
  const schedulerProvided = scheduler && typeof scheduler?.setTimeout === "function";
  initializeCooldownTelemetry({ schedulerProvided });
  const bus = createEventBus(overrides.eventBus);
  const controls = createCooldownControls({ emit: bus.emit });
  const context = detectOrchestratorContext(() => {
    if (typeof overrides.isOrchestrated === "function") {
      return overrides.isOrchestrated();
    }
    return isOrchestrated();
  });
  let orchestratedMode = context.orchestrated;
  const orchestratorMachine = context.machine;
  if (orchestratedMode && !orchestratorMachine) {
    orchestratedMode = false;
  }
  const { primary: btn, fallback: fallbackBtn } = resolveReadinessTarget();
  const readinessTarget = btn || fallbackBtn;
  if (readinessTarget && !orchestratedMode) {
    setupNonOrchestratedReady(readinessTarget, activeScheduler, {
      eventBus: bus,
      markReady: overrides.markReady
    });
  }
  if (orchestratedMode) {
    setupOrchestratedReady(controls, orchestratorMachine, btn, {
      eventBus: bus,
      scheduler: activeScheduler,
      markReady: overrides.markReady,
      dispatchBattleEvent: overrides.dispatchBattleEvent || dispatchBattleEvent
    });
  }
  const cooldownSeconds = computeNextRoundCooldown({ isTestModeEnabled });
  try {
    if (typeof console !== "undefined" && !process?.env?.VITEST)
      console.debug(
        `classicBattle.trace schedule:nextRound t=${Date.now()} secs=${cooldownSeconds}`
      );
  } catch {
    /* ignore logging errors so cooldown scheduling proceeds */
  }
  appendReadyTrace("cooldownDurationResolved", { seconds: cooldownSeconds });
  safeRound(
    "startCooldown.emitCountdownStarted",
    () =>
      bus.emit("control.countdown.started", {
        durationMs: Math.max(0, Number(cooldownSeconds) || 0) * 1000
      }),
    { suppressInProduction: true }
  );
  const timerOverrides = {
    eventBus: bus,
    markReady: overrides.markReady,
    scoreboard: overrides.scoreboard,
    showSnackbar: overrides.showSnackbar,
    setupFallbackTimer: overrides.setupFallbackTimer,
    dispatchBattleEvent: overrides.dispatchBattleEvent,
    createRoundTimer: overrides.createRoundTimer,
    startEngineCooldown: overrides.startEngineCooldown,
    updateDebugPanel: overrides.updateDebugPanel,
    isOrchestrated: overrides.isOrchestrated || isOrchestrated,
    getStateSnapshot: overrides.getStateSnapshot,
    setSkipHandler: overrides.setSkipHandler,
    requireEngine: overrides.requireEngine,
    getClassicBattleMachine: overrides.getClassicBattleMachine
  };
  const runtime = instantiateCooldownTimer(
    controls,
    btn,
    cooldownSeconds,
    activeScheduler,
    timerOverrides,
    bus
  );
  if (runtime?.promptWait?.shouldWait) {
    const fallbackMessage = "Opponent is choosing...";
    try {
      const key = "ui.opponentChoosing";
      const translated = typeof t === "function" ? t(key) : null;
      const message =
        typeof translated === "string" && translated.trim().length > 0
          ? translated
          : fallbackMessage;
      showSnackbar(message);
    } catch (error) {
      try {
        showSnackbar(fallbackMessage);
      } catch {
        if (
          typeof process !== "undefined" &&
          process?.env?.NODE_ENV !== "production" &&
          typeof console !== "undefined" &&
          typeof console.warn === "function"
        ) {
          console.warn("Failed to display opponent prompt snackbar:", error);
        }
      }
    }
  }
  const getReadyDispatched = () => hasReadyBeenDispatchedForCurrentCooldown();
  const onExpired = createExpirationDispatcher({
    controls,
    btn,
    runtime,
    handleExpiration: handleNextRoundExpiration,
    getReadyDispatched
  });
  registerSkipHandlerForTimer({
    runtime,
    controls,
    btn,
    handleExpiration: handleNextRoundExpiration
  });
  startTimerWithDiagnostics(runtime, cooldownSeconds);
  scheduleCooldownFallbacks({ runtime, cooldownSeconds, onExpired });
  const session = createNextRoundSession({
    controls,
    runtime,
    bus,
    scheduler: activeScheduler,
    orchestrated: orchestratedMode,
    machine: orchestratorMachine,
    readinessTarget,
    metadata: { cooldownSeconds }
  });
  const sessionControls = session.controls;
  currentNextRound = sessionControls;
  safeRound(
    "startCooldown.exposeCurrentNextRound",
    () => exposeDebugState("currentNextRound", sessionControls),
    { suppressInProduction: true }
  );
  safeRound(
    "startCooldown.flagStartCooldownCalled",
    () => exposeDebugState("startCooldownCalled", true),
    { suppressInProduction: true }
  );
  return sessionControls;
}

/**
 * @summary Expose the active cooldown controls for Next button helpers.
 * @summary Expose the active cooldown controls for Next button helpers.
 *
 * @pseudocode
 * 1. Return the cached `currentNextRound` controls when a cooldown is active.
 * 2. When controls are missing, inspect the Next button to fabricate resolved controls if it already signals readiness.
 * 3. Otherwise return `null` to indicate no cooldown is running.
 * @pseudocode
 * 1. Return the cached `currentNextRound` controls when a cooldown is active.
 * 2. When controls are missing, inspect the Next button to fabricate resolved controls if it already signals readiness.
 * 3. Otherwise return `null` to indicate no cooldown is running.
 *
 * @returns {{timer: ReturnType<typeof createRoundTimer>|null, resolveReady: (()=>void)|null, ready: Promise<void>|null}|null}
 * @pseudocode
 * 1. Return existing cooldown controls when present.
 * 2. Otherwise inspect the DOM for a ready button state and fabricate controls when needed.
 */
export function getNextRoundControls() {
  if (currentNextRound) return currentNextRound;
  // Fabricate controls when the button already indicates readiness. This keeps
  // E2E deterministic even when adapters are not bound and allows callers to
  // observe a resolved `ready` signal consistent with the UI state.
  const fabricated = safeRound(
    "getNextRoundControls.inspectDom",
    () => {
      const btn =
        typeof document !== "undefined"
          ? document.getElementById("next-button") ||
            document.querySelector('[data-role="next-round"]')
          : null;
      if (btn && (btn.getAttribute("data-next-ready") === "true" || btn.disabled === false)) {
        return { timer: null, resolveReady: () => {}, ready: Promise.resolve() };
      }
      return null;
    },
    { suppressInProduction: true, defaultValue: null }
  );
  if (fabricated) return fabricated;
  return null;
}

/**
 * Detect whether the classic battle orchestrator is active and get machine reference.
 *
 * @returns {object} Object containing orchestrated flag and machine reference.
 * @summary Check if orchestrator is running and get machine instance.
 * 1. Check if orchestration is enabled via isOrchestrated().
 * 2. Try to get machine instance from debug state.
 * 3. Return object with orchestrated flag and machine reference.
 */

function createExpirationTelemetryContext() {
  const debugExpose =
    typeof globalThis !== "undefined" && typeof globalThis.__classicBattleDebugExpose === "function"
      ? globalThis.__classicBattleDebugExpose.bind(globalThis)
      : undefined;
  const debugBagFactory = () => {
    if (typeof globalThis === "undefined") return null;
    return safeRound(
      "createExpirationTelemetryContext.debugBagFactory",
      () => (globalThis.__CLASSIC_BATTLE_DEBUG = globalThis.__CLASSIC_BATTLE_DEBUG || {}),
      { suppressInProduction: true, defaultValue: null }
    );
  };
  const { emit, getDebugBag } = createExpirationTelemetryEmitter({
    exposeDebugState,
    debugExpose,
    getDebugBag: debugBagFactory
  });
  emit("nextRoundExpired", true);
  emit("handleNextRoundExpirationCalled", true);
  return { emitTelemetry: emit, getDebugBag };
}

function guardReadyInFlight(controls, emitTelemetry, getDebugBag) {
  if (controls?.readyInFlight) {
    const snapshot = {
      readyDispatched: !!controls?.readyDispatched,
      readyInFlight: !!controls?.readyInFlight,
      reason: "inFlight"
    };
    emitTelemetry("handleNextRoundEarlyExit", snapshot);
    const bag = getDebugBag();
    if (bag) {
      bag.handleNextRound_earlyExit = bag.handleNextRound_earlyExit || [];
      bag.handleNextRound_earlyExit.push({ reason: "inFlight", at: Date.now() });
    }
    return true;
  }
  if (controls) {
    controls.readyInFlight = true;
    emitTelemetry("handleNextRoundEarlyExit", {
      readyDispatched: !!controls?.readyDispatched,
      readyInFlight: !!controls?.readyInFlight,
      reason: controls?.readyDispatched ? "preDispatched" : "enter"
    });
  }
  emitTelemetry("currentNextRoundReadyInFlight", !!controls?.readyInFlight);
  return false;
}

function prepareCooldownContext(options, emitTelemetry) {
  const clearSkipHandler =
    typeof options.setSkipHandler === "function" ? options.setSkipHandler : setSkipHandler;
  safeRound("prepareCooldownContext.clearSkipHandler", () => clearSkipHandler(null), {
    suppressInProduction: true
  });

  const scoreboardApi = options.scoreboard || scoreboard;
  safeRound("prepareCooldownContext.clearTimer", () => scoreboardApi?.clearTimer?.(), {
    suppressInProduction: true
  });

  const bus = createEventBus(options.eventBus);
  const getSnapshot = options.getStateSnapshot || getStateSnapshot;
  const machineReader = createMachineReader(options, {
    emitTelemetry,
    readDebugState,
    debugRead:
      typeof globalThis !== "undefined" && typeof globalThis.__classicBattleDebugRead === "function"
        ? globalThis.__classicBattleDebugRead
        : undefined
  });
  const isCooldownSafeState = (state) => {
    if (!state) return true;
    if (typeof state !== "string") return false;
    if (state === "cooldown" || state === "roundOver") return true;
    return isOrchestratorReadyState(state);
  };
  const inspector = createMachineStateInspector({
    machineReader,
    getSnapshot,
    getMachineState,
    isCooldownState: isCooldownSafeState,
    emitTelemetry
  });
  const markReady = options.markReady || markNextReady;
  const orchestrated =
    typeof options.isOrchestrated === "function" ? options.isOrchestrated : isOrchestrated;
  return { bus, inspector, machineReader, markReady, orchestrated };
}

function handleReadyDispatchEarlyExit({ context, controls, emitTelemetry, getDebugBag }) {
  const readyAlreadyDispatched =
    context?.alreadyDispatchedReady === true || hasReadyBeenDispatchedForCurrentCooldown();
  if (!readyAlreadyDispatched) return false;

  setReadyDispatchedForCurrentCooldown(true);
  const readyInFlight =
    (typeof context?.readyInFlight === "boolean" ? context.readyInFlight : undefined) ??
    (typeof controls?.readyInFlight === "boolean" ? controls.readyInFlight : undefined) ??
    false;

  emitTelemetry?.("handleNextRoundEarlyExit", {
    readyDispatched: true,
    readyInFlight,
    reason: "alreadyDispatched"
  });

  const bag = typeof getDebugBag === "function" ? getDebugBag() : null;
  if (bag) {
    bag.handleNextRound_earlyExit = bag.handleNextRound_earlyExit || [];
    bag.handleNextRound_earlyExit.push({ reason: "alreadyDispatched", at: Date.now() });
  }

  if (controls) {
    if (controls.__finalizingReady === true) {
      controls.readyInFlight = false;
      controls.readyDispatched = true;
    } else {
      finalizeReadyControls(controls, true);
    }
  }

  return true;
}

/**
 * Evaluate the machine dispatch results and determine whether additional
 * propagation steps are required.
 *
 * @param {object} params - Propagation evaluation context.
 * @param {{ dispatched: boolean, dedupeTracked: boolean }} params.state - The
 * machine dispatch outcome flags.
 * @param {() => boolean} params.shouldPropagateAfterMachine - Strategy that
 * determines whether bus propagation is allowed.
 * @param {() => void} params.markMachineHandled - Callback invoked when the
 * machine can finalize the dispatch without bus propagation.
 * @returns {{ propagate: boolean, requiresPropagation: boolean }} Propagation
 * metadata describing follow-up actions.
 *
 * @pseudocode
 * 1. If deduplication tracking is active, mark machine as handled and skip propagation
 * 2. Otherwise evaluate propagation requirements based on dispatch state and strategy
 * 3. Mark machine as handled when dispatch succeeded but propagation is disabled
 * 4. Return propagation flags for downstream decision making
 */
function evaluateMachineReadyPropagation({
  state,
  shouldPropagateAfterMachine,
  markMachineHandled
}) {
  if (state.dedupeTracked) {
    markMachineHandled?.();
    return { propagate: false, requiresPropagation: false };
  }
  const propagate = state.dispatched && shouldPropagateAfterMachine();
  const requiresPropagation = state.dispatched && propagate;
  if (state.dispatched && !propagate) {
    markMachineHandled?.();
  }
  return { propagate, requiresPropagation };
}

/**
 * @summary Compose ready dispatch strategies and fallback configuration with deterministic prioritization.
 *
 * @pseudocode
 * 1. Detect whether a custom dispatcher exists and configure bus dispatch options.
 * 2. Create a guarded helper for the machine strategy so it is registered once.
 * 3. When orchestrated without a custom dispatcher override, register the machine first so orchestration observes the event
 *    before fallbacks.
 * 4. Append custom dispatcher and bus strategies, then add the machine strategy again if not already present so manual flows
 *    still dispatch through the machine when earlier strategies short circuit.
 * 5. Return the strategy list alongside normalized fallback dispatchers for `runReadyDispatchStrategies`.
 *
 * @param {object} params - Strategy construction context.
 * @returns {{
 *   strategies: Array<() => Promise<boolean>|boolean>,
 *   fallbackDispatchers: Array<(type: string) => any>
 * }} Ordered strategies and deduplicated fallback dispatchers.
 */
function createReadyDispatchConfiguration({
  options,
  bus,
  machineReader,
  emitTelemetry,
  getDebugBag,
  orchestrated
}) {
  const busStrategyOptions = {};
  if (bus) {
    busStrategyOptions.eventBus = bus;
  }
  /** @type {Array<(type: string) => any>} */
  const fallbackDispatchers = [];
  const fallbackDispatcherRefs = typeof WeakSet === "function" ? new WeakSet() : null;
  const fallbackDispatcherSignatures = new Set();
  const registerFallbackDispatcher = (candidate) => {
    if (typeof candidate !== "function") return;
    const hasRef = fallbackDispatcherRefs
      ? fallbackDispatcherRefs.has(candidate)
      : fallbackDispatchers.includes(candidate);
    const signature = readReadyDispatcherSignature(candidate);
    if (hasRef || (signature && fallbackDispatcherSignatures.has(signature))) {
      return;
    }
    fallbackDispatchers.push(candidate);
    if (fallbackDispatcherRefs) {
      fallbackDispatcherRefs.add(candidate);
    }
    if (signature) {
      fallbackDispatcherSignatures.add(signature);
    }
  };
  const hasCustomDispatcher =
    typeof options.dispatchBattleEvent === "function" &&
    options.dispatchBattleEvent !== dispatchBattleEvent;
  registerFallbackDispatcher(options.dispatchBattleEvent);
  const shouldShortCircuitReadyDispatch = () => hasReadyBeenDispatchedForCurrentCooldown();
  const isOrchestratedActive = () => {
    if (typeof orchestrated === "function") {
      try {
        return orchestrated();
      } catch {
        return false;
      }
    }
    return !!orchestrated;
  };
  const shouldPropagateAfterMachine = () => isOrchestratedActive() && !hasCustomDispatcher;
  const machineDispatchState = {
    /** @type {boolean} Whether the machine successfully dispatched the ready event */
    dispatched: false,
    /** @type {boolean} Whether dedupe tracking was engaged during dispatch */
    dedupeTracked: false,
    /** @type {boolean} Whether this dispatch requires propagation to bus handlers */
    requiresPropagation: false
  };
  const machineStrategy = async () => {
    if (shouldShortCircuitReadyDispatch()) return true;
    const start =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    const rawResult = await dispatchReadyDirectly({ machineReader, emitTelemetry });
    const normalizedResult =
      rawResult && typeof rawResult === "object" && rawResult !== null
        ? {
            dispatched: rawResult.dispatched === true,
            dedupeTracked: rawResult.dedupeTracked === true
          }
        : { dispatched: rawResult === true, dedupeTracked: false };
    machineDispatchState.dispatched = normalizedResult.dispatched === true;
    machineDispatchState.dedupeTracked = normalizedResult.dedupeTracked === true;
    const { propagate: shouldPropagate, requiresPropagation } = evaluateMachineReadyPropagation({
      state: machineDispatchState,
      shouldPropagateAfterMachine,
      markMachineHandled: () => setReadyDispatchedForCurrentCooldown(true)
    });
    machineDispatchState.requiresPropagation = requiresPropagation;
    const end =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    emitTelemetry?.("handleNextRoundMachineStrategyResult", {
      dispatched: machineDispatchState.dispatched,
      propagate: shouldPropagate,
      dedupeTracked: machineDispatchState.dedupeTracked,
      needsPropagation: machineDispatchState.requiresPropagation,
      durationMs: typeof end === "number" && typeof start === "number" ? end - start : undefined
    });
    if (shouldPropagate) {
      return { dispatched: true, propagate: true };
    }
    return machineDispatchState.dispatched;
  };
  const strategies = [];
  let machineStrategyAdded = false;
  // Machine dispatch must appear exactly once in the strategy list while
  // retaining its priority before and after bus dispatch. We achieve this by
  // adding the function lazily: orchestrated flows register it first so the
  // orchestrator machine sees the event before any fallbacks, and non-
  // orchestrated flows add it after the bus strategy to guarantee the machine
  // still runs when earlier strategies short circuit. The guard prevents
  // duplicate registrations when both branches attempt to add it.
  const addMachineStrategy = () => {
    if (machineStrategyAdded) return;
    strategies.push(machineStrategy);
    machineStrategyAdded = true;
  };
  if (isOrchestratedActive() && !hasCustomDispatcher) {
    addMachineStrategy();
  }
  if (hasCustomDispatcher) {
    strategies.push(() => {
      if (shouldShortCircuitReadyDispatch()) return true;
      return dispatchReadyWithOptions({
        dispatchBattleEvent: options.dispatchBattleEvent,
        emitTelemetry,
        getDebugBag
      });
    });
    busStrategyOptions.dispatchBattleEvent = options.dispatchBattleEvent;
    busStrategyOptions.skipCandidate = true;
  } else if (typeof options.dispatchBattleEvent === "function") {
    busStrategyOptions.dispatchBattleEvent = options.dispatchBattleEvent;
  }
  registerFallbackDispatcher(busStrategyOptions.dispatchBattleEvent);
  strategies.push(() => {
    if (shouldShortCircuitReadyDispatch()) return true;
    return dispatchReadyViaBus({
      ...busStrategyOptions,
      // Machine handled the ready event and no additional propagation is needed.
      alreadyDispatched:
        machineDispatchState.dispatched && !machineDispatchState.requiresPropagation
    });
  });
  addMachineStrategy();
  return { strategies, fallbackDispatchers };
}

function finalizeReadyControls(controls, dispatched, options = {}) {
  if (!controls) return;
  const forceResolve = options.forceResolve === true;
  controls.readyInFlight = false;
  const resolver = typeof controls.resolveReady === "function" ? controls.resolveReady : null;
  const shouldResolveReady = Boolean(
    (dispatched || forceResolve) && !controls.readyDispatched && resolver
  );
  if (dispatched || forceResolve) {
    controls.readyDispatched = true;
    setNextButtonFinalizedState();
  }
  if (shouldResolveReady) {
    controls.__finalizingReady = true;
    try {
      resolver();
    } finally {
      controls.__finalizingReady = false;
    }
  }
}

/**
 * Handle the expiration of the next round cooldown timer.
 *
 * @param {object} controls - Cooldown controls object
 * @param {HTMLButtonElement|null|undefined} btn - Next button element
 * @param {object} [options={}] - Configuration options
 * @returns {Promise<boolean>} True if ready event was successfully dispatched
 * @pseudocode
 * 1. Prepare telemetry emitters and guard concurrent ready dispatch
 * 2. Establish machine inspector context and wait for cooldown
 * 3. Update UI affordances for readiness and refresh debug state
 * 4. Execute dispatch strategies and finalize control flags
 */
async function handleNextRoundExpiration(controls, btn, options = {}) {
  safeRound(
    "handleNextRoundExpiration.traceStart",
    () => appendReadyTrace("handleNextRoundExpiration.start", {}),
    { suppressInProduction: true }
  );
  if (typeof window !== "undefined") window.__NEXT_ROUND_EXPIRED = true;
  const { emitTelemetry, getDebugBag } = createExpirationTelemetryContext();
  if (
    handleReadyDispatchEarlyExit({
      context: options,
      controls,
      emitTelemetry,
      getDebugBag
    })
  ) {
    safeRound(
      "handleNextRoundExpiration.traceAlreadyDispatched",
      () => appendReadyTrace("handleNextRoundExpiration.alreadyDispatched", { dispatched: true }),
      { suppressInProduction: true }
    );
    return true;
  }
  if (guardReadyInFlight(controls, emitTelemetry, getDebugBag)) return;
  const { bus, inspector, machineReader, markReady, orchestrated } = prepareCooldownContext(
    options,
    emitTelemetry
  );
  await inspector.waitForCooldown(bus);
  await updateExpirationUi({
    isOrchestrated: orchestrated,
    markReady,
    button: btn,
    documentRef: typeof document !== "undefined" ? document : null,
    updateDebugPanel: async () => {
      const updatePanel = options.updateDebugPanel || (await getLazyUpdateDebugPanel());
      if (typeof updatePanel === "function") updatePanel();
    }
  });
  const { strategies, fallbackDispatchers } = createReadyDispatchConfiguration({
    options,
    bus,
    machineReader,
    emitTelemetry,
    getDebugBag,
    orchestrated
  });
  const fallbackConfig = {
    dispatcher:
      Array.isArray(fallbackDispatchers) && fallbackDispatchers.length > 0
        ? fallbackDispatchers[0]
        : options?.dispatchBattleEvent,
    dispatchers: fallbackDispatchers,
    useGlobal: options?.useGlobalReadyFallback === true,
    globalDispatcher:
      typeof options?.dispatchBattleEvent === "function"
        ? options.dispatchBattleEvent
        : dispatchBattleEvent
  };
  if (
    typeof fallbackConfig.dispatcher === "function" &&
    typeof fallbackConfig.globalDispatcher === "function" &&
    fallbackConfig.dispatcher === fallbackConfig.globalDispatcher
  ) {
    fallbackConfig.globalDispatcher = undefined;
  }
  const { dispatched, fallbackDispatched } = await runReadyDispatchStrategies({
    alreadyDispatchedReady:
      options?.alreadyDispatchedReady === true || hasReadyBeenDispatchedForCurrentCooldown(),
    strategies,
    emitTelemetry,
    fallback: fallbackConfig,
    returnOutcome: true
  });
  if (dispatched || fallbackDispatched) {
    setReadyDispatchedForCurrentCooldown(true);
  }
  if (dispatched) {
    safeRound(
      "handleNextRoundExpiration.traceDispatched",
      () => appendReadyTrace("handleNextRoundExpiration.dispatched", { dispatched: true }),
      { suppressInProduction: true }
    );
  } else if (fallbackDispatched) {
    safeRound(
      "handleNextRoundExpiration.traceFallbackDispatched",
      () =>
        appendReadyTrace("handleNextRoundExpiration.fallbackDispatched", {
          dispatched: false,
          fallbackDispatched: true
        }),
      { suppressInProduction: true }
    );
  } else {
    safeRound(
      "handleNextRoundExpiration.traceFallbackFinalize",
      () =>
        appendReadyTrace("handleNextRoundExpiration.fallbackFinalize", {
          dispatched: false
        }),
      { suppressInProduction: true }
    );
  }
  if (!dispatched && !fallbackDispatched) {
    emitBattleEvent("ready");
  }
  finalizeReadyControls(controls, dispatched, { forceResolve: !dispatched });
  safeRound(
    "handleNextRoundExpiration.traceEnd",
    () =>
      appendReadyTrace("handleNextRoundExpiration.end", {
        dispatched: !!dispatched,
        fallbackDispatched: fallbackDispatched === true
      }),
    { suppressInProduction: true }
  );
  return dispatched;
}

/**
 * Reset internal timers, flags and debug overrides for tests and runtime.
 *
 * Clears selection timers, resets scheduler state, clears any debug
 * startRoundOverride and emits a `game:reset-ui` event to allow the UI to
 * teardown and reinitialize.
 *
 * @summary Reset match subsystems and UI for tests.
 *
 * @pseudocode
 * 1. Reset skip and selection subsystems, recreate the engine via `createBattleEngine()`,
 *    and rebind engine events with `bridgeEngineEvents()`.
 * 2. Stop any schedulers and clear debug overrides on `window`.
 * 3. If a `store` is provided, clear its timeouts and selection state and
 *    dispatch `game:reset-ui` with the store detail. Otherwise dispatch a
 *    generic `game:reset-ui` with `store: null`.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @returns {void}
 */
export function _resetForTest(store) {
  resetSkipState();
  resetSelection();
  // In test environments, preserve existing engine to maintain score accumulation
  // Only create new engine if none exists
  const isVitest = typeof process !== "undefined" && process.env && process.env.VITEST;
  if (isVitest) {
    safeRound(
      "_resetForTest.ensureEngine",
      () => {
        battleEngine.getScores();
      },
      {
        fallback: () =>
          safeRound(
            "_resetForTest.createEngineForVitest",
            () => {
              createBattleEngine();
            },
            { suppressInProduction: true }
          ),
        suppressInProduction: true
      }
    );
  } else {
    // In production, always create a fresh engine
    safeRound("_resetForTest.createEngine", () => createBattleEngine(), {
      suppressInProduction: true,
      rethrow: true
    });
  }
  bridgeEngineEvents();
  // In certain test environments, module mocking can cause `bridgeEngineEvents`
  // to bind using a different facade instance than the one the test spies on.
  // As a safety net, rebind via the locally imported facade when it's a mock.
  safeRound(
    "_resetForTest.rebindMockListeners",
    () => {
      const maybeMock = /** @type {any} */ (battleEngine).on;
      if (typeof maybeMock === "function" && typeof maybeMock.mock === "object") {
        /**
         * Mirrors the production bridge's `handleRoundEnded` logic when the engine facade
         * is mocked, ensuring scoreboard observers and round resolution listeners stay
         * synchronized during test resets.
         *
         * @pseudocode
         * ```
         * on fallback roundEnded detail:
         *   emit roundResolved(detail)
         *   emit display.score.update({ player: Number(detail.playerScore) || 0,
         *                               opponent: Number(detail.opponentScore) || 0 })
         * ```
         * @param {{ playerScore?: number|string, opponentScore?: number|string }} detail
         *   Round payload provided by the mocked engine facade.
         * @returns {void}
         */
        const emitFallbackRoundEvents = (detail) => {
          emitBattleEvent("roundResolved", detail);
          try {
            const player = Number(detail?.playerScore) || 0;
            const opponent = Number(detail?.opponentScore) || 0;
            emitBattleEvent("display.score.update", { player, opponent });
          } catch (error) {
            // Scoreboard updates are opportunistic; swallow errors after recording usage.
            void error;
          }
        };

        maybeMock("roundEnded", emitFallbackRoundEvents);
        maybeMock("matchEnded", (detail) => {
          emitBattleEvent("matchOver", detail);
        });
      }
    },
    { suppressInProduction: true }
  );
  stopScheduler();
  if (typeof window !== "undefined") {
    const api = readDebugState("classicBattleDebugAPI");
    if (api) delete api.startRoundOverride;
    else delete window.startRoundOverride;
  }
  if (store && typeof store === "object") {
    safeRound(
      "_resetForTest.clearStoreTimeouts",
      () => {
        clearTimeout(store.statTimeoutId);
        clearTimeout(store.autoSelectId);
      },
      { suppressInProduction: true }
    );
    store.statTimeoutId = null;
    store.autoSelectId = null;
    store.selectionMade = false;
    store.__lastSelectionMade = false;
    // Reset any prior player stat selection
    store.playerChoice = null;
    try {
      delete store[ROUND_START_GUARD];
      delete store[ACTIVE_ROUND_PAYLOAD];
      delete store[ROUND_RESOLUTION_GUARD];
      delete store[LAST_ROUND_RESULT];
      delete store[Symbol.for("classicBattle.selectionInFlight")];
    } catch (error) {
      // Ignore cleanup errors when clearing residual round state.
      void error;
    }
    try {
      if (typeof window !== "undefined") {
        window.__classicBattleSelectionFinalized = false;
        window.__classicBattleLastFinalizeContext = null;
      }
    } catch {
      // Intentionally ignore window global availability errors when resetting selection metadata.
    }
    safeRound("_resetForTest.cancelCompareRaf", () => cancelFrame(store.compareRaf), {
      suppressInProduction: true
    });
    store.compareRaf = 0;
    if (typeof window !== "undefined") {
      safeRound(
        "_resetForTest.dispatchStoreReset",
        () => window.dispatchEvent(new CustomEvent("game:reset-ui", { detail: { store } })),
        { suppressInProduction: true }
      );
    }
  } else {
    // Best-effort notify UI without a concrete store instance
    if (typeof window !== "undefined") {
      safeRound(
        "_resetForTest.dispatchNullReset",
        () => window.dispatchEvent(new CustomEvent("game:reset-ui", { detail: { store: null } })),
        { suppressInProduction: true }
      );
    }
  }
}

/**
 * @summary Reset the Classic Battle match state and UI via the shared test helper.
 * @summary Reset the Classic Battle match state and UI via the shared test helper.
 *
 * Alias of `_resetForTest` used by orchestrator and other callers.
 *
 * @pseudocode
 * 1. Delegate to `_resetForTest(store)` to perform the full reset workflow.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store forwarded to `_resetForTest`.
 * @returns {void}
 */
export const resetGame = _resetForTest;

/**
 * Detect whether the classic battle orchestrator is active.
 *
 * @returns {boolean} True if the orchestrator is active, false otherwise.
 */
function isOrchestrated() {
  return safeRound("isOrchestrated", () => !!document.body.dataset.battleState, {
    suppressInProduction: true,
    defaultValue: false
  });
}

/**
 * @summary Test-only alias for the finalizeReadyControls guard.
 *
 * @pseudocode
 * 1. Return the finalizeReadyControls reference so tests can import the guard logic.
 *
 * @returns {typeof finalizeReadyControls} The finalizeReadyControls implementation for tests.
 */
export const __testFinalizeReadyControls = finalizeReadyControls;
