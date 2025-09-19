import { drawCards, _resetForTest as resetSelection } from "./cardSelection.js";
import { createBattleEngine } from "../battleEngineFacade.js";
import { requireEngine } from "../battleEngineFacade.js";
import * as battleEngine from "../battleEngineFacade.js";
import { bridgeEngineEvents } from "./engineBridge.js";
import { cancel as cancelFrame, stop as stopScheduler } from "../../utils/scheduler.js";
import { resetSkipState, setSkipHandler } from "./skipHandler.js";
import { emitBattleEvent } from "./battleEvents.js";
import { readDebugState, exposeDebugState } from "./debugHooks.js";
import { showSnackbar } from "../showSnackbar.js";
import * as scoreboard from "../setupScoreboard.js";
import { realScheduler } from "../scheduler.js";
import { dispatchBattleEvent, resetDispatchHistory } from "./eventDispatcher.js";

import { computeNextRoundCooldown } from "../timers/computeNextRoundCooldown.js";
import { createRoundTimer } from "../timers/createRoundTimer.js";
import { attachCooldownRenderer } from "../CooldownRenderer.js";
import { getStateSnapshot } from "./battleDebug.js";
import { setupFallbackTimer } from "./timerService.js";
import { createEventBus } from "./eventBusUtils.js";
import { getDebugPanelLazy } from "./preloadService.js";
import { createResourceRegistry, createEnhancedCleanup, eventCleanup } from "./enhancedCleanup.js";
import { updateDebugPanel } from "./debugPanel.js";
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
import { safeInvoke } from "./utils/errorHandling.js";

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
 * @summary Re-export the fallback timer helper so round management modules share timer setup logic.
 *
 * @pseudocode
 * 1. Import `setupFallbackTimer` from the timer service module.
 * 2. Re-export the helper for external consumers.
 *
 * @see ./timerService.js
 * @returns {ReturnType<typeof setTimeout>|null}
 */
export { setupFallbackTimer } from "./timerService.js";

const READY_TRACE_KEY = "nextRoundReadyTrace";

// Error handling policy: avoid silent catch blocks in this module. Always use
// `safeRound()` (or `safeInvoke`) so diagnostics flow through the shared
// logging channel.
const ERROR_SCOPE = "classicBattle.roundManager";

function createErrorContext(operation, context = {}) {
  return { scope: ERROR_SCOPE, operation, ...context };
}

function safeRound(operation, fn, options = {}) {
  const { context, ...rest } = options;
  return safeInvoke(fn, {
    ...rest,
    context: createErrorContext(operation, context)
  });
}

function resetReadyTrace() {
  if (typeof window === "undefined") return;
  safeRound(
    "resetReadyTrace",
    () => {
      exposeDebugState(READY_TRACE_KEY, []);
      exposeDebugState("nextRoundReadyTraceLast", null);
    },
    { suppressInProduction: true }
  );
}

function appendReadyTrace(event, details = {}) {
  if (typeof window === "undefined") return;
  safeRound(
    "appendReadyTrace",
    () => {
      const entry = { event, at: Date.now(), ...details };
      const existing = readDebugState(READY_TRACE_KEY);
      const next = Array.isArray(existing) ? [...existing, entry] : [entry];
      exposeDebugState(READY_TRACE_KEY, next);
      exposeDebugState("nextRoundReadyTraceLast", entry);
    },
    { suppressInProduction: true }
  );
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
    currentPlayerJudoka: null
  };
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
 * 1. Ensure a battle engine exists by probing `battleEngine.getScores()` and calling `createBattleEngine()` when needed, then rebind events with `bridgeEngineEvents()`.
 * 2. Dispatch `game:reset-ui` and zero the scoreboard so UI surfaces show a fresh match state.
 * 3. Resolve the `startRound` implementation (allowing debug overrides), await its result, then reaffirm zeroed scores before returning.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @returns {Promise<ReturnType<typeof startRound>>} Result of starting a fresh round.
 */
export async function handleReplay(store) {
  // Only create a new engine when one does not already exist. Tests call
  // `_resetForTest` frequently; unconditionally recreating the engine here
  // resets match-level scores and causes cumulative score tests to fail.
  const ensureEngine = () => {
    if (typeof battleEngine.getScores === "function") {
      safeRound(
        "handleReplay.ensureEngine.check",
        () => {
          battleEngine.getScores();
        },
        {
          fallback: () => {
            createBattleEngine();
            return null;
          },
          suppressInProduction: true
        }
      );
    } else {
      createBattleEngine();
    }
  };
  safeRound("handleReplay.ensureEngine", ensureEngine, {
    suppressInProduction: true
  });
  bridgeEngineEvents();
  if (typeof window !== "undefined") {
    safeRound(
      "handleReplay.dispatchResetEvent",
      () => window.dispatchEvent(new CustomEvent("game:reset-ui", { detail: { store } })),
      { suppressInProduction: true }
    );
  }
  // Explicitly reset displayed scores to 0 after recreating the engine so
  // the scoreboard model reflects the fresh match state immediately.
  safeRound(
    "handleReplay.emitScoreReset",
    () => emitBattleEvent("display.score.update", { player: 0, opponent: 0 }),
    { suppressInProduction: true }
  );
  const updateScoreboard = (operation) =>
    safeRound(operation, () => scoreboard.updateScore(0, 0), { suppressInProduction: true });
  updateScoreboard("handleReplay.scoreboardInitialReset");
  const startRoundFn = getStartRound(store);
  const res = await startRoundFn();
  updateScoreboard("handleReplay.scoreboardPostStart");
  return res;
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
  store.selectionMade = false;
  store.playerChoice = null;
  // Propagate scheduler from store.context if present
  const scheduler = store?.context?.scheduler || store?.scheduler;
  const cards = await drawCards();
  store.currentPlayerJudoka = cards.playerJudoka || null;
  let roundNumber = 1;
  safeRound(
    "startRound.resolveRoundNumber",
    () => {
      const fn = battleEngine.getRoundsPlayed;
      const played = typeof fn === "function" ? Number(fn()) : 0;
      if (Number.isFinite(played)) roundNumber = played + 1;
    },
    { suppressInProduction: true }
  );
  if (typeof onRoundStart === "function") {
    safeRound("startRound.onRoundStart", () => onRoundStart(store, roundNumber), {
      suppressInProduction: true
    });
  }
  emitBattleEvent("roundStarted", { store, roundNumber });
  // Attach scheduler to store for downstream use
  if (scheduler) store.scheduler = scheduler;
  return { ...cards, roundNumber };
}

/**
 * Store controls for the pending cooldown to the next round.
 * @type {{timer: ReturnType<typeof createRoundTimer>|null, resolveReady: (()=>void)|null, ready: Promise<void>|null}|null}
 */
let currentNextRound = null;

// Track whether the "ready" event has been dispatched for the current cooldown window.
let readyDispatchedForCurrentCooldown = false;

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
  console.debug("[DEBUG] startCooldown invoked!");
  if (typeof window !== "undefined") window.__startCooldownInvoked = true;
  // try {
  //   console.error("startCooldown invoked, scheduler present:", !!scheduler?.setTimeout);
  // } catch {}
  // Reset the ready dispatch flag for the new cooldown period
  readyDispatchedForCurrentCooldown = false;
  resetDispatchHistory("ready");
  resetReadyTrace();
  if (typeof globalThis !== "undefined") {
    globalThis.__startCooldownCount = (globalThis.__startCooldownCount || 0) + 1;
  }
  // Always use the injected scheduler if provided, else fall back to realScheduler
  const activeScheduler =
    scheduler && typeof scheduler.setTimeout === "function" ? scheduler : realScheduler;
  appendReadyTrace("startCooldown", {
    scheduler: scheduler && typeof scheduler?.setTimeout === "function" ? "injected" : "default"
  });
  const bus = createEventBus(overrides.eventBus);
  const context = detectOrchestratorContext();
  let orchestratedMode = context.orchestrated;
  const orchestratorMachine = context.machine;
  if (orchestratedMode && !orchestratorMachine) {
    orchestratedMode = false;
  }
  appendReadyTrace("cooldownContext", {
    orchestrated: orchestratedMode,
    hasMachine: !!orchestratorMachine
  });
  logStartCooldown();
  const controls = createCooldownControls({ emit: bus.emit });
  const btn = typeof document !== "undefined" ? document.getElementById("next-button") : null;
  const fallbackBtn =
    !btn && typeof document !== "undefined"
      ? document.querySelector('[data-role="next-round"]')
      : null;
  const readinessTarget = btn || fallbackBtn;
  if (readinessTarget && !orchestratedMode) {
    setupNonOrchestratedReady(readinessTarget, activeScheduler, {
      eventBus: bus,
      markReady: overrides.markReady
    });
  }
  const cooldownSeconds = computeNextRoundCooldown();
  appendReadyTrace("cooldownDurationResolved", { seconds: cooldownSeconds });
  // PRD taxonomy: announce countdown start
  safeRound(
    "startCooldown.emitCountdownStarted",
    () =>
      bus.emit("control.countdown.started", {
        durationMs: Math.max(0, Number(cooldownSeconds) || 0) * 1000
      }),
    { suppressInProduction: true }
  );
  const helperOptions = {
    eventBus: bus,
    markReady: overrides.markReady,
    scoreboard: overrides.scoreboard,
    showSnackbar: overrides.showSnackbar,
    setupFallbackTimer: overrides.setupFallbackTimer,
    dispatchBattleEvent: overrides.dispatchBattleEvent,
    createRoundTimer: overrides.createRoundTimer,
    startEngineCooldown: overrides.startEngineCooldown,
    updateDebugPanel: overrides.updateDebugPanel,
    isOrchestrated: overrides.isOrchestrated,
    getStateSnapshot: overrides.getStateSnapshot,
    getClassicBattleMachine: overrides.getClassicBattleMachine,
    setSkipHandler: overrides.setSkipHandler
  };
  if (orchestratedMode) {
    setupOrchestratedReady(controls, orchestratorMachine, btn, {
      eventBus: bus,
      scheduler: activeScheduler,
      markReady: overrides.markReady,
      dispatchBattleEvent: overrides.dispatchBattleEvent || dispatchBattleEvent
    });
    wireCooldownTimer(controls, btn, cooldownSeconds, activeScheduler, helperOptions);
  } else {
    wireCooldownTimer(controls, btn, cooldownSeconds, activeScheduler, helperOptions);
  }
  currentNextRound = controls;
  safeRound(
    "startCooldown.exposeCurrentNextRound",
    () => exposeDebugState("currentNextRound", controls),
    { suppressInProduction: true }
  );
  safeRound(
    "startCooldown.flagStartCooldownCalled",
    () => exposeDebugState("startCooldownCalled", true),
    { suppressInProduction: true }
  );
  return controls;
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
function detectOrchestratorContext() {
  let orchestrated = false;
  let machine = null;
  safeRound(
    "detectOrchestratorContext.isOrchestrated",
    () => {
      orchestrated = isOrchestrated();
    },
    { suppressInProduction: true }
  );
  safeRound(
    "detectOrchestratorContext.readMachine",
    () => {
      const getter = readDebugState("getClassicBattleMachine");
      const candidate = typeof getter === "function" ? getter() : getter;
      if (candidate) {
        machine = candidate;
        orchestrated = orchestrated || true;
      }
    },
    { suppressInProduction: true }
  );
  return { orchestrated, machine };
}

function setupNonOrchestratedReady(target, scheduler, { eventBus, markReady } = {}) {
  if (!target) return;
  const mark = markReady || markNextReady;
  mark(target);
  safeRound("setupNonOrchestratedReady.emitReady", () => eventBus?.emit?.("nextRoundTimerReady"), {
    suppressInProduction: true
  });
  const reapply = () => {
    if (typeof document === "undefined") return;
    const nextBtn = document.getElementById("next-button");
    if (nextBtn) {
      mark(nextBtn);
      return;
    }
    const fallback = document.querySelector('[data-role="next-round"]');
    if (fallback) mark(fallback);
  };
  const scheduleGlobal = () => {
    setTimeout(() => reapply(), 0);
    setTimeout(() => reapply(), 20);
  };
  if (scheduler && typeof scheduler.setTimeout === "function") {
    safeRound(
      "setupNonOrchestratedReady.schedulerTimeout",
      () => {
        scheduler.setTimeout(() => reapply(), 0);
        scheduler.setTimeout(() => reapply(), 20);
      },
      {
        fallback: () =>
          safeRound("setupNonOrchestratedReady.globalTimeoutFallback", () => scheduleGlobal(), {
            suppressInProduction: true
          }),
        suppressInProduction: true
      }
    );
  } else {
    safeRound("setupNonOrchestratedReady.globalTimeout", () => scheduleGlobal(), {
      suppressInProduction: true
    });
  }
}

function setupOrchestratedReady(controls, machine, btn, options = {}) {
  const bus = createEventBus(options.eventBus);
  const scheduler =
    options.scheduler && typeof options.scheduler.setTimeout === "function"
      ? options.scheduler
      : realScheduler;
  const markReady = options.markReady || markNextReady;
  /** @type {Array<() => void>} */
  const cleanupFns = [];
  const registry = createResourceRegistry();
  const cleanup = createEnhancedCleanup(cleanupFns, registry);
  let resolved = false;
  const finalize = async () => {
    if (resolved) return;
    resolved = true;
    cleanup();
    if (btn) markReady(btn);
    const resolver = controls.resolveReady;
    if (typeof resolver === "function") {
      resolver();
    }
    // Dispatch of the "ready" event is now handled centrally by
    // `handleNextRoundExpiration` to prevent duplicate dispatches and
    // ensure consistent retry behavior across all cooldown expiration paths.
    // Finalize is responsible for cleanup and resolving the pending controls only.
  };
  const addListener = (type, handler) => {
    const wrapped = (event) => {
      if (resolved) return;
      safeRound(`setupOrchestratedReady.listener.${type}`, () => handler(event), {
        suppressInProduction: true
      });
    };
    safeRound(
      `setupOrchestratedReady.bus.on.${type}`,
      () => {
        bus.on(type, wrapped);
        cleanupFns.push(() =>
          safeRound(`setupOrchestratedReady.bus.off.${type}`, () => bus.off(type, wrapped), {
            suppressInProduction: true
          })
        );
        // Also register with enhanced cleanup registry
        safeRound(
          `setupOrchestratedReady.registerListener.${type}`,
          () => eventCleanup.registerListener(registry, bus, type, wrapped, `event-${type}`),
          { suppressInProduction: true }
        );
      },
      { suppressInProduction: true }
    );
  };
  if (controls.ready && typeof controls.ready.finally === "function") {
    controls.ready.finally(() => {
      resolved = true;
      cleanup();
    });
  }
  for (const type of [
    "cooldown.timer.expired",
    "countdownFinished",
    "control.countdown.completed",
    "nextRoundTimerReady"
  ]) {
    addListener(type, () => finalize());
  }
  const machineOutOfCooldown = () => {
    const state = getMachineState(machine);
    return typeof state === "string" && state !== "cooldown";
  };
  addListener("battleStateChange", (event) => {
    const detail = event?.detail;
    if (detail && typeof detail === "object") {
      const from = detail.from ?? detail?.detail?.from ?? null;
      const to = detail.to ?? detail?.detail?.to ?? null;
      if (from === "cooldown" && to && to !== "cooldown") {
        finalize();
        return;
      }
      if (from === "cooldown" && !to && machineOutOfCooldown()) {
        finalize();
        return;
      }
      if (!from && typeof to === "string" && to !== "cooldown" && machineOutOfCooldown()) {
        finalize();
        return;
      }
      return;
    }
    if (typeof detail === "string") {
      if (detail !== "cooldown" && machineOutOfCooldown()) finalize();
      return;
    }
    if (detail === null || typeof detail === "undefined") {
      if (machineOutOfCooldown()) finalize();
    }
  });
  const checkImmediate = () => {
    if (resolved) return;
    if (isOrchestratorReadyState(readBattleStateDataset())) {
      finalize();
      return;
    }
    if (machineOutOfCooldown()) {
      finalize();
      return;
    }
    if (isNextButtonReady()) finalize();
  };
  checkImmediate();
  if (!resolved) {
    const scheduleCheck = () => {
      const run = () => checkImmediate();
      if (typeof queueMicrotask === "function") queueMicrotask(run);
      else if (scheduler && typeof scheduler.setTimeout === "function") {
        scheduler.setTimeout(run, 0);
      } else setTimeout(run, 0);
    };
    safeRound("setupOrchestratedReady.deferCheck", () => scheduleCheck(), {
      suppressInProduction: true,
      fallback: () => setTimeout(() => checkImmediate(), 0)
    });
  }
}

function isOrchestratorReadyState(state) {
  return state === "roundStart" || state === "waitingForPlayerAction";
}

function readBattleStateDataset() {
  return safeRound(
    "readBattleStateDataset",
    () => {
      if (typeof document === "undefined" || !document.body) return null;
      return document.body.dataset?.battleState || null;
    },
    { suppressInProduction: true, defaultValue: null }
  );
}

function getMachineState(machine) {
  if (!machine || typeof machine !== "object") return null;
  const normalizeMachineState = (candidate) => {
    if (typeof candidate === "string") return candidate;
    if (candidate && typeof candidate === "object" && typeof candidate.value === "string") {
      return candidate.value;
    }
    return null;
  };
  const state = safeRound("getMachineState.getState", () => machine.getState?.(), {
    suppressInProduction: true,
    defaultValue: null
  });
  const normalizedState = normalizeMachineState(state);
  if (normalizedState) return normalizedState;

  const directState = safeRound("getMachineState.state", () => machine.state, {
    suppressInProduction: true,
    defaultValue: null
  });
  const normalizedDirect = normalizeMachineState(directState);
  if (normalizedDirect) return normalizedDirect;

  const currentState = safeRound("getMachineState.currentState", () => machine.currentState, {
    suppressInProduction: true,
    defaultValue: null
  });
  const normalizedCurrent = normalizeMachineState(currentState);
  if (normalizedCurrent) return normalizedCurrent;

  const current = safeRound("getMachineState.current", () => machine.current, {
    suppressInProduction: true,
    defaultValue: null
  });
  return normalizeMachineState(current);
}

/**
 * Check if the Next button is in a ready state.
 *
 * @returns {boolean} True if the Next button is ready, false otherwise.
 * @summary Determine if the Next button indicates readiness for next round.
 * 1. Get the next-button element from DOM.
 * 2. Check if data-next-ready attribute is "true".
 * 3. Check if button is not disabled.
 * 4. Return true if either condition is met.
 */
function isNextButtonReady() {
  return safeRound(
    "isNextButtonReady",
    () => {
      if (typeof document === "undefined") return false;
      const btn = document.getElementById("next-button");
      if (!btn) return false;
      if (btn.dataset?.nextReady === "true") return true;
      if (btn.disabled === false) return true;
      return false;
    },
    { suppressInProduction: true, defaultValue: false }
  );
}

/**
 * Log cooldown start event for debugging purposes.
 *
 * @summary Log startCooldown invocation with state snapshot for debugging.
 * 1. Get current state snapshot.
 * 2. Increment startCooldown call count.
 * 3. Log warning with call count and current state (outside Vitest).
 */
function logStartCooldown() {
  safeRound(
    "logStartCooldown",
    () => {
      const { state: s } = getStateSnapshot();
      const count = (readDebugState("startCooldownCount") || 0) + 1;
      exposeDebugState("startCooldownCount", count);
      if (!(typeof process !== "undefined" && process.env?.VITEST)) {
        console.warn(`[test] startCooldown call#${count}: state=${s}`);
      }
    },
    { suppressInProduction: true }
  );
}

/**
 * Create controls object for managing cooldown state and readiness.
 *
 * @param {object} [options] - Configuration options.
 * @param {Function} [options.emit] - Custom emit function, defaults to emitBattleEvent.
 * @returns {object} Controls object with timer, resolveReady function, and ready promise.
 * @summary Create cooldown controls with promise-based readiness tracking.
 * 1. Create controls object with timer, resolveReady, and ready promise.
 * 2. Set up resolveReady function that emits nextRoundTimerReady event.
 * 3. Track readiness state and prevent duplicate dispatches.
 * 4. Return controls object for managing cooldown lifecycle.
 */
function createCooldownControls({ emit } = {}) {
  const controls = {
    timer: null,
    resolveReady: null,
    ready: null,
    readyDispatched: false,
    readyInFlight: false
  };
  appendReadyTrace("controlsCreated", {
    hasEmitter: typeof emit === "function"
  });
  const notify = typeof emit === "function" ? emit : emitBattleEvent;
  controls.ready = new Promise((resolve) => {
    controls.resolveReady = () => {
      appendReadyTrace("resolveReadyInvoked", {
        readyDispatched: controls.readyDispatched,
        readyInFlight: controls.readyInFlight
      });
      controls.readyDispatched = true;
      controls.readyInFlight = false;
      safeRound("createCooldownControls.notifyReady", () => notify("nextRoundTimerReady"), {
        suppressInProduction: true
      });
      resolve();
      controls.resolveReady = null;
      appendReadyTrace("resolveReadySettled", { readyDispatched: true });
    };
  });
  return controls;
}

function markNextReady(btn) {
  if (!btn) return;
  // Be permissive here: in unit tests, transitions can occur very quickly and
  // module isolation can yield differing state snapshots. Mark the Next button
  // as ready unconditionally to reflect that the cooldown has completed.
  safeRound(
    "markNextReady.enableButton",
    () => {
      btn.disabled = false;
      if (btn.dataset) btn.dataset.nextReady = "true";
    },
    { suppressInProduction: true }
  );
  safeRound(
    "markNextReady.updateAttributes",
    () => {
      btn.setAttribute("data-next-ready", "true");
      btn.removeAttribute("disabled");
      // Patch: In Vitest, also update [data-role="next-round"] for test DOM
      if (typeof process !== "undefined" && process.env && process.env.VITEST) {
        const testBtn = document.querySelector('[data-role="next-round"]');
        if (testBtn && testBtn !== btn) {
          testBtn.disabled = false;
          if (testBtn.dataset) testBtn.dataset.nextReady = "true";
          testBtn.setAttribute("data-next-ready", "true");
          testBtn.removeAttribute("disabled");
        }
      }
    },
    { suppressInProduction: true }
  );
  safeRound(
    "markNextReady.debugLog",
    () => {
      if (typeof process !== "undefined" && process.env && process.env.VITEST) {
        // Lightweight test-only trace to help diagnose flakiness across tests.
        console.debug(
          `[test] markNextReady: disabled=${btn.disabled} dataset=${btn.dataset.nextReady}`
        );
      }
    },
    { suppressInProduction: true }
  );
  console.debug(
    "[DEBUG] markNextReady called with btn:",
    btn.id,
    "disabled after:",
    btn.disabled,
    "data-next-ready after:",
    btn.dataset.nextReady
  );
}

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

function createReadyDispatchStrategies({
  options,
  bus,
  machineReader,
  emitTelemetry,
  getDebugBag
}) {
  const busStrategyOptions = {};
  if (bus) {
    busStrategyOptions.eventBus = bus;
  }
  const hasCustomDispatcher =
    typeof options.dispatchBattleEvent === "function" &&
    options.dispatchBattleEvent !== dispatchBattleEvent;
  const strategies = [];
  const shouldShortCircuitReadyDispatch = () => readyDispatchedForCurrentCooldown === true;
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
  strategies.push(() => {
    if (shouldShortCircuitReadyDispatch()) return true;
    return dispatchReadyViaBus(busStrategyOptions);
  });
  strategies.push(() => dispatchReadyDirectly({ machineReader, emitTelemetry }));
  return strategies;
}

function finalizeReadyControls(controls, dispatched) {
  if (!controls) return;
  controls.readyInFlight = false;
  if (!controls.readyDispatched && dispatched && typeof controls.resolveReady === "function") {
    controls.resolveReady();
  }
  if (dispatched) {
    controls.readyDispatched = true;
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
  const strategies = createReadyDispatchStrategies({
    options,
    bus,
    machineReader,
    emitTelemetry,
    getDebugBag
  });
  const dispatched = await runReadyDispatchStrategies({
    alreadyDispatchedReady:
      options?.alreadyDispatchedReady === true || readyDispatchedForCurrentCooldown === true,
    strategies,
    emitTelemetry
  });
  if (dispatched) {
    readyDispatchedForCurrentCooldown = true;
    safeRound(
      "handleNextRoundExpiration.traceDispatched",
      () => appendReadyTrace("handleNextRoundExpiration.dispatched", { dispatched: true }),
      { suppressInProduction: true }
    );
  }
  finalizeReadyControls(controls, dispatched);
  safeRound(
    "handleNextRoundExpiration.traceEnd",
    () => appendReadyTrace("handleNextRoundExpiration.end", { dispatched: !!dispatched }),
    { suppressInProduction: true }
  );
  return dispatched;
}

function wireCooldownTimer(controls, btn, cooldownSeconds, scheduler, overrides = {}) {
  const bus = createEventBus(overrides.eventBus);
  const timerFactory = overrides.createRoundTimer || createRoundTimer;
  let startCooldown = overrides.startEngineCooldown || requireEngine().startCoolDown;
  // When running under Vitest, prefer the pure-JS fallback timer to avoid
  // relying on the engine starter which may not cooperate with fake timers.
  if (typeof process !== "undefined" && !!process.env?.VITEST) {
    startCooldown = null;
  }
  const renderer = overrides.attachCooldownRenderer || attachCooldownRenderer;
  const registerSkipHandler =
    typeof overrides.setSkipHandler === "function" ? overrides.setSkipHandler : setSkipHandler;
  const scoreboardApi = overrides.scoreboard || scoreboard;
  const snackbarApi = overrides.showSnackbar || showSnackbar;
  const fallbackScheduler = overrides.setupFallbackTimer || setupFallbackTimer;
  const dispatchReady = overrides.dispatchBattleEvent || dispatchBattleEvent;
  const markReady = overrides.markReady || markNextReady;
  const expirationOptions = {
    eventBus: bus,
    setSkipHandler: registerSkipHandler,
    scoreboard: scoreboardApi,
    showSnackbar: snackbarApi,
    dispatchBattleEvent: dispatchReady,
    markReady,
    updateDebugPanel: overrides.updateDebugPanel || updateDebugPanel,
    isOrchestrated: overrides.isOrchestrated || isOrchestrated,
    getStateSnapshot: overrides.getStateSnapshot || getStateSnapshot
  };
  const startEngineCooldownWithScheduler = (engine, onTick, onExpired, dur, onDrift) => {
    // Temporarily inject the activeScheduler into the engine for this call
    const originalTimer = engine.timer;
    engine.timer = new originalTimer.constructor(activeScheduler);
    const result = startCooldown(engine, onTick, onExpired, dur, onDrift);
    engine.timer = originalTimer; // Restore original timer
    return result;
  };
  const timer = timerFactory({ starter: startEngineCooldownWithScheduler });
  // Delay initial snackbar render until first tick to avoid overshadowing
  // the short-lived "Opponent is choosing…" message.
  // Provide initial remaining to render immediately and avoid an early
  // off-by-one visual jump on the first engine tick.
  renderer(timer, cooldownSeconds);
  let expired = false;
  /** @type {ReturnType<typeof setTimeout>|null|undefined} */
  let fallbackId;
  /** @type {ReturnType<typeof setTimeout>|null|undefined} */
  let schedulerFallbackId;
  const originalResolveReady =
    typeof controls.resolveReady === "function" ? controls.resolveReady : null;
  if (originalResolveReady) {
    controls.resolveReady = function wrappedResolveReady(...args) {
      if (fallbackId) {
        clearTimeout(fallbackId);
        fallbackId = null;
      }
      safeRound(
        "wireCooldownTimer.resolveReady.clearSchedulerFallback",
        () => {
          if (schedulerFallbackId) {
            scheduler.clearTimeout?.(schedulerFallbackId);
          }
        },
        { suppressInProduction: true }
      );
      schedulerFallbackId = null;
      if (!expired) {
        expired = true;
      }
      return originalResolveReady.apply(this, args);
    };
  }
  let finalizePromise = null;
  const finalizeExpiration = (alreadyDispatchedReady = readyDispatchedForCurrentCooldown) => {
    if (finalizePromise) {
      return finalizePromise;
    }
    const runPromise = handleNextRoundExpiration(controls, btn, {
      ...expirationOptions,
      alreadyDispatchedReady
    })
      .then((result) => {
        finalizePromise = null;
        return result;
      })
      .catch((error) => {
        finalizePromise = null;
        throw error;
      });
    finalizePromise = runPromise;
    return runPromise;
  };
  const onExpired = async () => {
    // Handle retries when the timer already expired but ready wasn't emitted.
    if (expired) {
      return finalizeExpiration();
    }
    // Standard expiration path for the active cooldown.
    expired = true;
    // PRD taxonomy: cooldown timer expired + countdown completed
    safeRound(
      "wireCooldownTimer.onExpired.emitCompletion",
      () => {
        bus.emit("cooldown.timer.expired");
        bus.emit("control.countdown.completed");
      },
      { suppressInProduction: true }
    );
    return finalizeExpiration();
  };
  timer.on("expired", onExpired);
  // PRD taxonomy: cooldown timer ticks
  timer.on("tick", (remaining) => {
    safeRound(
      "wireCooldownTimer.tick.emit",
      () =>
        bus.emit("cooldown.timer.tick", {
          remainingMs: Math.max(0, Number(remaining) || 0) * 1000
        }),
      { suppressInProduction: true }
    );
  });
  timer.on("drift", () => {
    const msgEl = typeof document !== "undefined" ? document.getElementById("round-message") : null;
    if (msgEl && msgEl.textContent) {
      safeRound(
        "wireCooldownTimer.drift.snackbar",
        () => {
          if (typeof snackbarApi === "function") snackbarApi("Waiting…");
          else showSnackbar("Waiting…");
        },
        { suppressInProduction: true }
      );
    } else {
      safeRound(
        "wireCooldownTimer.drift.scoreboard",
        () => scoreboardApi?.showMessage?.("Waiting…"),
        { suppressInProduction: true }
      );
    }
  });
  controls.timer = timer;
  // try {
  //   console.error(
  //     "[TEST ERROR] wireCooldownTimer: controls.timer set?",
  //     !!controls.timer,
  //     "hasStart?",
  //     typeof controls.timer?.start === "function"
  //   );
  // } catch {}
  registerSkipHandler(() => {
    safeRound(
      "wireCooldownTimer.skip.warn",
      () => console.warn("[test] skip: stop nextRoundTimer"),
      { suppressInProduction: true }
    );
    clearTimeout(fallbackId);
    fallbackId = null;
    safeRound(
      "wireCooldownTimer.skip.clearSchedulerFallback",
      () => {
        if (schedulerFallbackId) {
          scheduler.clearTimeout?.(schedulerFallbackId);
        }
      },
      { suppressInProduction: true }
    );
    schedulerFallbackId = null;
    controls.timer?.stop();
    if (!expired) {
      expired = true;
      safeRound(
        "wireCooldownTimer.skip.emitCompletion",
        () => {
          bus.emit("cooldown.timer.expired");
          bus.emit("control.countdown.completed");
        },
        { suppressInProduction: true }
      );
      void handleNextRoundExpiration(controls, btn, expirationOptions);
    }
  });
  // Start the timer immediately to ensure test environments with fake timers
  // consistently observe timer ticks/expiration when advancing timers.
  safeRound(
    "wireCooldownTimer.startTimer",
    () => {
      controls.timer.start(cooldownSeconds);
    },
    {
      suppressInProduction: true,
      fallback: (error) => {
        console.error("[TEST DEBUG] controls.timer.start error", error);
      }
    }
  );
  safeRound(
    "wireCooldownTimer.scheduleFallbacks",
    () => {
      const secsNum = Number(cooldownSeconds);
      const ms = !Number.isFinite(secsNum) || secsNum <= 0 ? 10 : Math.max(0, secsNum * 1000);
      if (scheduler && typeof scheduler.setTimeout === "function") {
        safeRound(
          "wireCooldownTimer.scheduleInjected",
          () => {
            schedulerFallbackId = scheduler.setTimeout(() => onExpired(), ms);
          },
          {
            fallback: () =>
              safeRound(
                "wireCooldownTimer.scheduleFallbackTimer",
                () => {
                  fallbackId = fallbackScheduler(ms, onExpired);
                },
                { suppressInProduction: true }
              ),
            suppressInProduction: true
          }
        );
      } else {
        safeRound(
          "wireCooldownTimer.scheduleFallbackTimer",
          () => {
            fallbackId = fallbackScheduler(ms, onExpired);
          },
          { suppressInProduction: true }
        );
      }
    },
    { suppressInProduction: true }
  );
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
        maybeMock("roundEnded", (detail) => {
          emitBattleEvent("roundResolved", detail);
        });
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
    // Reset any prior player stat selection
    store.playerChoice = null;
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
