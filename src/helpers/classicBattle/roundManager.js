// Battle engine & core logic
import { drawCards, _resetForTest as resetSelection } from "./cardSelection.js";
import { createBattleEngine } from "../BattleEngine.js";
import * as battleEngine from "../BattleEngine.js";
import { logSelectionMutation, shouldClearSelectionForNextRound } from "./selectionHandler.js";

// Utilities
import { cancel as cancelFrame, stop as stopScheduler } from "../../utils/scheduler.js";
import { resetSkipState, setSkipHandler, skipCurrentPhase } from "./skipHandler.js";
import { emitBattleEvent, onBattleEvent, offBattleEvent } from "./battleEvents.js";
import { roundState } from "./roundState.js";
import { readDebugState, exposeDebugState } from "./debugHooks.js";
import { writeScoreDisplay, syncScoreboardDisplay } from "./scoreDisplay.js";
import * as scoreboard from "../setupScoreboard.js";
import logger from "../logger.js";
import { dispatchBattleEvent } from "./eventDispatcher.js";
import { computeNextRoundCooldown } from "../timers/computeNextRoundCooldown.js";
import { isTestModeEnabled } from "../testModeUtils.js";
import { buildBootstrapConfig } from "./bootstrapPolicy.js";
import { getStateSnapshot } from "./battleDebug.js";
import { createEventBus } from "./eventBusUtils.js";
import { updateDebugPanel } from "./debugPanel.js";
import { setNextButtonFinalizedState } from "./uiHelpers.js";
import { showSnackbar } from "../showSnackbar.js";
import { t } from "../i18n.js";
import { SESSION_PROJECTION_FIELDS, VIEW_PROJECTION_FIELDS } from "./stateOwnership.js";

// Guard & storage utilities
import { enterStoreGuard, getHiddenStoreValue, setHiddenStoreValue } from "./storeGuard.js";
import { resetSelectionFinalized } from "./selectionState.js";
import {
  getOpponentCardContainer,
  hideOpponentCardIfRealVisible,
  ensureOpponentPlaceholderVisibility
} from "./domHelpers.js";
import { readReadyDispatcherSignature } from "./readyDispatcherUtils.js";

// Expiration & ready dispatch handling
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

// Cooldown orchestration
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

// Session & state management
import { createNextRoundSession } from "./nextRound/session.js";
import {
  hasReadyBeenDispatchedForCurrentCooldown,
  resetReadyDispatchState,
  setReadyDispatchedForCurrentCooldown
} from "./roundReadyState.js";

// Match deck
import {
  createMatchDeckHooks,
  resetMatchDeckState,
  DEFAULT_MATCH_DECK_SIZE
} from "./matchDeckManager.js";

// State guards for round management
const ROUND_START_GUARD = Symbol.for("classicBattle.startRoundGuard");
const ACTIVE_ROUND_PAYLOAD = Symbol.for("classicBattle.activeRoundPayload");
const ROUND_RESOLUTION_GUARD = Symbol.for("classicBattle.roundResolutionGuard");
const LAST_ROUND_RESULT = Symbol.for("classicBattle.lastResolvedRoundResult");
const SELECTION_IN_FLIGHT_GUARD = Symbol.for("classicBattle.selectionInFlight");

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
  const viewProjection = {
    selectionMade: false,
    roundReadyForInput: false,
    stallTimeoutMs: 35000,
    autoSelectId: null,
    autoSelectCountdownId: null,
    autoSelectExecuteId: null,
    autoSelectRoundToken: null,
    autoSelectScheduleNonce: 0,
    playerChoice: null,
    playerCardEl: null,
    opponentCardEl: null,
    statButtonEls: null
  };

  const sessionProjection = {
    currentPlayerJudoka: null,
    currentOpponentJudoka: null,
    lastPlayerStats: null,
    lastOpponentStats: null,
    matchDeck: [],
    matchDeckSize: DEFAULT_MATCH_DECK_SIZE,
    pendingOpponentFromDeck: null,
    usedOpponentIds: new Set(),
    roundsPlayed: 0
  };

  return {
    ...viewProjection,
    ...sessionProjection,
    projection: {
      view: viewProjection,
      session: sessionProjection,
      ownership: {
        authority: "orchestrator-engine",
        notes: "Store fields are projection-only. Domain progression is owned by state machine.",
        viewFields: [...VIEW_PROJECTION_FIELDS],
        sessionFields: [...SESSION_PROJECTION_FIELDS]
      }
    }
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
 * 1. Reset the battle engine via `resetBattleEnginePreservingConfig()` (falling back to `createBattleEngine()` when unavailable).
 * 2. Dispatch `game:reset-ui` and zero the scoreboard so UI surfaces show a fresh match state.
 * 3. Resolve the `startRound` implementation (allowing debug overrides), await its result, then reaffirm zeroed scores before returning.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @returns {Promise<ReturnType<typeof startRound>>} Result of starting a fresh round.
 */
export async function handleReplay(store) {
  persistLastJudokaStats(store, store?.currentPlayerJudoka, store?.currentOpponentJudoka);
  resetMatchDeckState(store);

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

    createBattleEngine(buildBootstrapConfig({ getStateSnapshot, forceCreate: true }));
  };

  safeRound("handleReplay.resetEngine", resetEngine, { suppressInProduction: true });

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
    "handleReplay.resetRoundStateNumber",
    () => roundState.setRoundNumber(0, { emitLegacyEvent: false }),
    { suppressInProduction: true }
  );

  const startRoundFn = getStartRound(store);
  const result = await startRoundFn();

  safeRound("handleReplay.reapplyScoreboardReset", applyZeroScores, { suppressInProduction: true });

  // Ensure round counter is explicitly set to 1 after replay to prevent stale state issues
  safeRound(
    "handleReplay.confirmRoundOne",
    () => roundState.setRoundNumber(1, { emitLegacyEvent: false }),
    { suppressInProduction: true }
  );

  return result;
}

/**
 * @summary Prepare and announce the next battle round.
 *
 * @pseudocode
 * 1. Clear selection state on the store to prepare for a new choice.
 * 2. Await `drawCards()` to populate round card data and persist the active player judoka.
 * 3. Derive the upcoming round number from the battle engine, falling back to one when unavailable.
 * 4. Invoke the optional `onRoundStart` callback for any additional work.
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
    const resetSelectionFlags = (source) => {
      if (!store || typeof store !== "object") {
        return false;
      }
      if (!shouldClearSelectionForNextRound(store)) {
        logSelectionMutation(`${source}.deferred`, store, {
          currentRoundsPlayed: store.roundsPlayed,
          lastSelectionRound: store.__lastSelectionRound
        });
        return false;
      }
      const hadSelection = !!store.selectionMade || !!store.__lastSelectionMade;
      if (!hadSelection) {
        return false;
      }
      const prevSelectionMade = store.selectionMade;
      const prevLastSelectionMade = store.__lastSelectionMade;
      store.selectionMade = false;
      store.__lastSelectionMade = false;
      logSelectionMutation(source, store, {
        currentRoundsPlayed: store.roundsPlayed,
        prevSelectionMade,
        prevLastSelectionMade
      });
      return true;
    };
    const selectionInFlight = !!store?.[SELECTION_IN_FLIGHT_GUARD];
    if (!selectionInFlight) {
      try {
        clearTimeout(store?.autoSelectId);
        clearTimeout(store?.autoSelectCountdownId);
        clearTimeout(store?.autoSelectExecuteId);
      } catch (error) {
        void error;
      }
      store.autoSelectId = null;
      store.autoSelectCountdownId = null;
      store.autoSelectExecuteId = null;
      store.autoSelectRoundToken = null;
      store.autoSelectScheduleNonce = 0;
      store.playerChoice = null;
      resetSelectionFlags("startRound.reset");
      try {
        // Use unified selection state API (store.selectionMade is source of truth)
        resetSelectionFinalized(store);
      } catch {
        // Intentionally ignore window global availability errors when resetting selection metadata.
      }
    } else {
      logSelectionMutation("startRound.resetSkipped", store, {
        currentRoundsPlayed: store.roundsPlayed,
        selectionInFlight: true
      });
    }
    // Hide opponent card at start of round to prevent premature reveal when a real card is present
    const opponentContainer = hideOpponentCardIfRealVisible(getOpponentCardContainer());
    // Propagate scheduler from store.context if present
    const scheduler = store?.context?.scheduler || store?.scheduler;
    const matchDeckHooks = createMatchDeckHooks(store);
    const cards = await drawCards({
      randomJudoka: (pool) => matchDeckHooks.randomJudoka(pool),
      opponentSelectionHooks: {
        onCandidateAccepted: (candidate, meta) =>
          matchDeckHooks.onCandidateAccepted(candidate, meta),
        onCandidateRejected: (candidate, meta) =>
          matchDeckHooks.onCandidateRejected(candidate, meta)
      }
    });
    const activeContainer =
      opponentContainer && opponentContainer.isConnected
        ? opponentContainer
        : getOpponentCardContainer(); // Fallback if element was disconnected during async operations
    ensureOpponentPlaceholderVisibility(activeContainer);
    store.currentPlayerJudoka = cards.playerJudoka || null;
    store.currentOpponentJudoka = cards.opponentJudoka || null;
    persistLastJudokaStats(store, cards.playerJudoka, cards.opponentJudoka);
    try {
      queueMicrotask(() => {
        try {
          if (store?.[SELECTION_IN_FLIGHT_GUARD]) {
            logSelectionMutation("startRound.microtaskResetSkipped", store, {
              currentRoundsPlayed: store.roundsPlayed,
              selectionInFlight: true
            });
            return;
          }
          resetSelectionFlags("startRound.microtaskReset");
        } catch {
          // Safely ignore any errors resetting selection state
        }
      });
    } catch {
      // Safely ignore any errors during microtask scheduling
    }
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
    // Synchronise centralized store
    try {
      try {
        roundState.setRoundNumber(roundNumber);
      } catch {
        /* keep behaviour stable on failure */
      }
      try {
        roundState.setRoundState("roundPrompt", "startRound");
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
 * Store controls for the active cooldown timer.
 * Used to clean up existing timers when starting a new cooldown.
 * @type {{timer: ReturnType<typeof createRoundTimer>|null, resolveReady: (()=>void)|null, ready: Promise<void>|null}|null}
 */
let activeCooldownControls = null;

/**
 * @summary Schedule the cooldown before the next round and expose controls for the Next button.
 *
 * @pseudocode
 * 1. Reset readiness tracking, determine the active scheduler, and capture orchestration context for telemetry.
 * 2. Build the event bus and cooldown controls, wiring DOM readiness handlers when the UI is not orchestrated.
 * 3. Compute the cooldown duration, emit countdown events, and configure helpers and timers for orchestrated or default flows.
 * 4. Persist the resulting controls for later retrieval and surface them through debug state before returning.
 *
 * @param {ReturnType<typeof createBattleStore>} _store - Battle state store.
 * @param {typeof realScheduler} [scheduler=realScheduler] - Scheduler for timers.
 * @returns {{timer: ReturnType<typeof createRoundTimer>|null, resolveReady: (()=>void)|null, ready: Promise<void>|null}}
 */
export function startCooldown(_store, scheduler, overrides = {}) {
  resetReadyDispatchState();

  // Stop any existing cooldown timer to prevent old timers from firing
  // when time advances (prevents duplicate ready dispatches in tests)
  if (activeCooldownControls?.timer && typeof activeCooldownControls.timer.stop === "function") {
    try {
      activeCooldownControls.timer.stop();
    } catch (error) {
      // Ignore errors during cleanup
      if (process?.env?.NODE_ENV !== "test" && typeof console !== "undefined") {
        try {
          console.warn("Failed to stop existing cooldown timer:", error);
        } catch {
          // Ignore console errors
        }
      }
    }
  }

  const activeScheduler = resolveActiveScheduler(scheduler);
  const schedulerProvided = scheduler && typeof scheduler?.setTimeout === "function";
  initializeCooldownTelemetry({ schedulerProvided });
  const bus = createEventBus(overrides.eventBus);
  const controls = createCooldownControls({ emit: bus.emit });

  // Track these controls as active for cleanup on next cooldown
  activeCooldownControls = controls;
  const handleSkipCooldown = () => {
    skipCurrentPhase();
  };
  onBattleEvent("skipCooldown", handleSkipCooldown);
  const detachSkipCooldown = () => offBattleEvent("skipCooldown", handleSkipCooldown);
  try {
    controls.ready?.then(detachSkipCooldown).catch(detachSkipCooldown);
  } catch {
    detachSkipCooldown();
  }
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
  safeRound(
    "startCooldown.emitNextRoundCountdownStarted",
    () =>
      bus.emit("nextRoundCountdownStarted", {
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
 *
 * @pseudocode
 * 1. Return the cached `currentNextRound` controls when a cooldown is active.
 * 2. When controls are missing, inspect the Next button to fabricate resolved controls if it already signals readiness.
 * 3. Otherwise return `null` to indicate no cooldown is running.
 *
 * @returns {{timer: ReturnType<typeof createRoundTimer>|null, resolveReady: (()=>void)|null, ready: Promise<void>|null}|null}
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
    if (state === "roundWait" || state === "roundDisplay") return true;
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
    const shouldForceMachineDispatchAfterShared = (() => {
      if (!isOrchestratedActive()) return false;
      try {
        const machine = machineReader?.();
        return typeof machine?.dispatch === "function";
      } catch {
        return false;
      }
    })();
    const start =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    const rawResult = await dispatchReadyDirectly({
      machineReader,
      emitTelemetry,
      forceMachineDispatchAfterShared: shouldForceMachineDispatchAfterShared,
      customDispatcher: options.dispatchBattleEvent
    });
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

    // Only skip setting finalized state if we're already in roundSelect
    // In all other states (including roundWait, roundPrompt, roundDisplay), we should set it
    // This handles the case where cooldown expires and we need to finalize the Next button
    let shouldSetFinalized = true; // Default to setting it
    let debugInfo = { hasMachine: false, state: "unknown" };
    try {
      const machine = controls.getClassicBattleMachine?.();
      debugInfo.hasMachine = !!machine;
      if (machine && typeof machine.getState === "function") {
        const currentState = machine.getState();
        debugInfo.state = currentState;
        // Only skip if we're already in roundSelect (selection phase)
        shouldSetFinalized = currentState !== "roundSelect";
      }
      // If we can't get the machine or state, set finalized (default true)
    } catch (err) {
      debugInfo.error = err.message;
      // If error, still set finalized (defensive - prefer setting it)
    }

    // Debug logging
    if (typeof console !== "undefined" && typeof process !== "undefined" && process.env?.VITEST) {
      console.log("[finalizeReadyControls]", {
        shouldSetFinalized,
        dispatched,
        forceResolve: options.forceResolve,
        ...debugInfo
      });
    }

    if (shouldSetFinalized) {
      setNextButtonFinalizedState();
    }
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
      const updatePanel = options.updateDebugPanel || updateDebugPanel;
      if (typeof updatePanel === "function") {
        updatePanel();
      }
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
 * 1. Reset skip and selection subsystems and recreate the engine via `createBattleEngine()`.
 * 2. Stop any schedulers and clear debug overrides on `window`.
 * 3. If a `store` is provided, clear its timeouts and selection state and
 *    dispatch `game:reset-ui` with the store detail. Otherwise dispatch a
 *    generic `game:reset-ui` with `store: null`.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {object} [preserveConfig] - Configuration to preserve when creating engine (e.g., { pointsToWin: 10 })
 * @returns {void}
 */
export function _resetForTest(store, preserveConfig = {}) {
  resetSkipState();
  resetSelection();
  resetMatchDeckState(store);
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
              createBattleEngine(
                buildBootstrapConfig({ engineConfig: preserveConfig, getStateSnapshot })
              );
            },
            { suppressInProduction: true }
          ),
        suppressInProduction: true
      }
    );
  } else {
    // In production, always create a fresh engine with preserved config
    safeRound(
      "_resetForTest.createEngine",
      () =>
        createBattleEngine(
          buildBootstrapConfig({ engineConfig: preserveConfig, getStateSnapshot })
        ),
      {
        suppressInProduction: true,
        rethrow: true
      }
    );
  }
  stopScheduler();
  // Reset module-level cooldown state to prevent test pollution
  currentNextRound = null;
  activeCooldownControls = null;
  // Reset Next button state to prevent test pollution
  if (typeof document !== "undefined") {
    const nextBtn = document.getElementById("next-button");
    if (nextBtn) {
      nextBtn.disabled = true;
      delete nextBtn.dataset.nextReady;
    }
    // Reset battle state dataset to prevent orchestrator state pollution
    if (document.body) {
      delete document.body.dataset.battleState;
    }
  }
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
        clearTimeout(store.autoSelectCountdownId);
        clearTimeout(store.autoSelectExecuteId);
      },
      { suppressInProduction: true }
    );
    store.statTimeoutId = null;
    store.autoSelectId = null;
    store.autoSelectCountdownId = null;
    store.autoSelectExecuteId = null;
    store.autoSelectRoundToken = null;
    store.autoSelectScheduleNonce = 0;
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
      // Use unified selection state API (store.selectionMade is source of truth)
      resetSelectionFinalized(store);
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
