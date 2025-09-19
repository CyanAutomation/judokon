import { safeInvoke } from "./utils/errorHandling.js";
import { exposeDebugState, readDebugState } from "./debugHooks.js";
import { emitBattleEvent } from "./battleEvents.js";
import { createEventBus } from "./eventBusUtils.js";
import { dispatchBattleEvent } from "./eventDispatcher.js";
import { setSkipHandler } from "./skipHandler.js";
import { showSnackbar } from "../showSnackbar.js";
import * as scoreboard from "../setupScoreboard.js";
import { realScheduler } from "../scheduler.js";
import { attachCooldownRenderer } from "../CooldownRenderer.js";
import { createRoundTimer } from "../timers/createRoundTimer.js";
import { setupFallbackTimer } from "./setupFallbackTimer.js";
import { createResourceRegistry, createEnhancedCleanup, eventCleanup } from "./enhancedCleanup.js";
import { getStateSnapshot } from "./battleDebug.js";
import { updateDebugPanel } from "./debugPanel.js";
import { requireEngine } from "../battleEngineFacade.js";

const ERROR_SCOPE = "classicBattle.roundManager";

function createErrorContext(operation, context = {}) {
  return { scope: ERROR_SCOPE, operation, ...context };
}

/**
 * @summary Execute a function with shared error handling context.
 * @param {string} operation - Operation name for diagnostics.
 * @param {Function} fn - Callback to execute safely.
 * @param {object} [options={}] - Invocation options forwarded to `safeInvoke`.
 * @returns {*} Result of the callback or fallback when provided.
 * @pseudocode
 * 1. Merge provided context with the round manager scope.
 * 2. Delegate execution to `safeInvoke` with the computed context.
 * 3. Return the callback result or any configured fallback value.
 */
export function safeRound(operation, fn, options = {}) {
  const { context, ...rest } = options;
  return safeInvoke(fn, {
    ...rest,
    context: createErrorContext(operation, context)
  });
}
/**
 * @summary Reset cooldown readiness trace entries in debug state.
 * @returns {void}
 * @pseudocode
 * 1. Exit when not running in a browser environment.
 * 2. Clear the readiness trace array and last entry via `exposeDebugState`.
 */
export function resetReadyTrace() {
  if (typeof window === "undefined") return;
  safeRound(
    "resetReadyTrace",
    () => {
      exposeDebugState("nextRoundReadyTrace", []);
      exposeDebugState("nextRoundReadyTraceLast", null);
    },
    { suppressInProduction: true }
  );
}

const READY_TRACE_KEY = "nextRoundReadyTrace";

/**
 * @summary Append an event entry to the cooldown readiness trace.
 * @param {string} event - Marker describing the lifecycle event.
 * @param {object} [details={}] - Additional metadata to record.
 * @returns {void}
 * @pseudocode
 * 1. Skip when the DOM is unavailable.
 * 2. Build an entry with a timestamp and merge provided details.
 * 3. Persist the updated trace and last entry via `exposeDebugState`.
 */
export function appendReadyTrace(event, details = {}) {
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
 * @summary Track startCooldown invocations for debugging.
 * @returns {void}
 * @pseudocode
 * 1. Read the current state snapshot for context.
 * 2. Increment the stored invocation counter.
 * 3. Emit a diagnostic warning outside Vitest environments.
 */
export function logStartCooldown() {
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
 * @summary Prime telemetry state for a new cooldown cycle.
 * @param {{schedulerProvided: boolean}} options - Scheduler usage metadata.
 * @returns {void}
 * @pseudocode
 * 1. Flag global debug fields indicating a new cooldown invocation.
 * 2. Reset readiness traces for the upcoming cycle.
 * 3. Record the cooldown start event with scheduler context.
 */
export function initializeCooldownTelemetry({ schedulerProvided }) {
  if (typeof window !== "undefined") {
    window.__startCooldownInvoked = true;
  }
  if (typeof globalThis !== "undefined") {
    globalThis.__startCooldownCount = (globalThis.__startCooldownCount || 0) + 1;
  }
  resetReadyTrace();
  appendReadyTrace("startCooldown", {
    scheduler: schedulerProvided ? "injected" : "default"
  });
  logStartCooldown();
}

/**
 * @summary Resolve the scheduler to use for cooldown timers.
 * @param {object|null|undefined} candidate - Optional injected scheduler.
 * @returns {typeof realScheduler|object} Scheduler instance to use.
 * @pseudocode
 * 1. Return the injected scheduler when it exposes `setTimeout`.
 * 2. Otherwise fall back to the shared real scheduler.
 */
export function resolveActiveScheduler(candidate) {
  if (candidate && typeof candidate.setTimeout === "function") {
    return candidate;
  }
  return realScheduler;
}

/**
 * @summary Detect orchestrator activity and resolve the machine reference.
 * @param {Function} isOrchestrated - Callback indicating orchestrator presence.
 * @returns {{orchestrated: boolean, machine: any}} Detection result.
 * @pseudocode
 * 1. Probe the provided detector to determine base orchestration state.
 * 2. Read any exported machine getter from debug state.
 * 3. Return the orchestration flag alongside the resolved machine.
 */
export function detectOrchestratorContext(isOrchestrated) {
  let orchestrated = false;
  let machine = null;
  safeRound(
    "detectOrchestratorContext.isOrchestrated",
    () => {
      orchestrated = Boolean(isOrchestrated?.());
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
  appendReadyTrace("cooldownContext", {
    orchestrated,
    hasMachine: !!machine
  });
  return { orchestrated, machine };
}

/**
 * @summary Create cooldown control primitives for readiness handling.
 * @param {{emit?: Function}} [options={}] - Optional custom emitter override.
 * @returns {{timer: any, resolveReady: (() => void)|null, ready: Promise<void>, readyDispatched: boolean, readyInFlight: boolean}}
 * Control object coordinating timer state and readiness resolution.
 * @pseudocode
 * 1. Initialise the control container with default state flags.
 * 2. Attach a readiness promise that emits through the provided bus.
 * 3. Track readiness state transitions to update debug traces.
 */
export function createCooldownControls({ emit } = {}) {
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

/**
 * @summary Mark the Next button as ready for the upcoming round.
 * @param {HTMLElement|null|undefined} btn - Button element to update.
 * @returns {void}
 * @pseudocode
 * 1. Enable the provided button and set readiness attributes.
 * 2. Mirror readiness to test DOM fallbacks when applicable.
 * 3. Emit debug traces describing the state change.
 */
export function markNextReady(btn) {
  if (!btn) return;
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
        console.debug(
          `[test] markNextReady: disabled=${btn.disabled} dataset=${btn.dataset.nextReady}`
        );
      }
    },
    { suppressInProduction: true }
  );
  console.debug(
    "[DEBUG] markNextReady called with btn:",
    btn?.id,
    "disabled after:",
    btn?.disabled,
    "data-next-ready after:",
    btn?.dataset?.nextReady
  );
}

/**
 * @summary Establish readiness affordances when the orchestrator is inactive.
 * @param {HTMLElement|null} target - Primary button element to update.
 * @param {object|null} scheduler - Optional scheduler to mirror readiness.
 * @param {{eventBus?: any, markReady?: Function}} [options={}] - Supporting overrides.
 * @returns {void}
 * @pseudocode
 * 1. Mark the target button as ready and emit the readiness event.
 * 2. Schedule follow-up checks via injected or global timers.
 * 3. Reapply readiness styling to fallback buttons when discovered.
 */
export function setupNonOrchestratedReady(target, scheduler, { eventBus, markReady } = {}) {
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

/**
 * @summary Attach orchestrator listeners to resolve cooldown readiness.
 * @param {ReturnType<typeof createCooldownControls>} controls - Cooldown control object.
 * @param {any} machine - Classic battle state machine instance.
 * @param {HTMLElement|null} btn - Primary Next button element.
 * @param {object} [options={}] - Optional overrides including event bus and scheduler.
 * @returns {void}
 * @pseudocode
 * 1. Register event listeners that finalize controls when cooldown completes.
 * 2. Observe machine transitions to detect readiness outside nominal paths.
 * 3. Schedule deferred checks to catch immediate readiness states.
 */
export function setupOrchestratedReady(controls, machine, btn, options = {}) {
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

/**
 * @summary Determine if a machine state implies cooldown readiness.
 * @param {string|null|undefined} state - Machine state candidate.
 * @returns {boolean} True when the state signals readiness.
 * @pseudocode
 * 1. Treat "roundStart" and "waitingForPlayerAction" as ready states.
 * 2. Return false for all other values.
 */
export function isOrchestratorReadyState(state) {
  return state === "roundStart" || state === "waitingForPlayerAction";
}

/**
 * @summary Read the orchestration state from the document dataset.
 * @returns {string|null} The battle state string or null when unavailable.
 * @pseudocode
 * 1. Guard against missing document or body references.
 * 2. Return the value of `data-battle-state` when present.
 */
export function readBattleStateDataset() {
  return safeRound(
    "readBattleStateDataset",
    () => {
      if (typeof document === "undefined" || !document.body) return null;
      return document.body.dataset?.battleState || null;
    },
    { suppressInProduction: true, defaultValue: null }
  );
}

/**
 * @summary Normalize state values from a provided battle machine.
 * @param {any} machine - Classic battle machine instance.
 * @returns {string|null} The resolved state string when available.
 * @pseudocode
 * 1. Attempt to read state via `getState` and normalize string values.
 * 2. Fallback to direct properties such as `state`, `currentState`, or `current`.
 * 3. Return the first matching string representation encountered.
 */
export function getMachineState(machine) {
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
 * @summary Determine if the Next button already signals readiness.
 * @returns {boolean} True when the button is enabled or marked ready.
 * @pseudocode
 * 1. Retrieve the Next button element when available.
 * 2. Return true if `data-next-ready` is "true" or the button is enabled.
 */
export function isNextButtonReady() {
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
 * @summary Locate primary and fallback readiness button elements.
 * @returns {{primary: HTMLElement|null, fallback: HTMLElement|null}} Readiness targets.
 * @pseudocode
 * 1. Attempt to read the primary Next button by ID.
 * 2. Fallback to the `[data-role="next-round"]` selector when needed.
 * 3. Return both references for downstream consumers.
 */
export function resolveReadinessTarget() {
  const btn = typeof document !== "undefined" ? document.getElementById("next-button") : null;
  const fallback =
    !btn && typeof document !== "undefined"
      ? document.querySelector('[data-role="next-round"]')
      : null;
  return { primary: btn, fallback };
}

/**
 * @summary Build the runtime structures required for the cooldown timer.
 * @param {ReturnType<typeof createCooldownControls>} controls - Cooldown controls container.
 * @param {HTMLElement|null} btn - Button used for readiness updates.
 * @param {number} cooldownSeconds - Duration of the cooldown in seconds.
 * @param {object|null} scheduler - Optional scheduler override.
 * @param {object} [overrides={}] - Dependency injection overrides.
 * @param {any} [providedBus] - Optional pre-built event bus instance.
 * @returns {{timer: any, bus: any, fallbackScheduler: Function, scheduler: any, scoreboardApi: any, snackbarApi: any, expirationOptions: object, registerSkipHandler: Function, expired: boolean, fallbackId: any, schedulerFallbackId: any, finalizePromise: Promise<any>|null}}
 * Runtime state used to drive the cooldown lifecycle.
 * @pseudocode
 * 1. Resolve engine starter and supporting dependencies from overrides.
 * 2. Instantiate the round timer and renderer, wiring diagnostic events.
 * 3. Produce a runtime object capturing scheduler and fallback metadata.
 */
export function instantiateCooldownTimer(
  controls,
  btn,
  cooldownSeconds,
  scheduler,
  overrides = {},
  providedBus
) {
  const bus = providedBus || createEventBus(overrides.eventBus);
  const timerFactory = overrides.createRoundTimer || createRoundTimer;
  const engineProvider = overrides.requireEngine || requireEngine;
  let startCooldown = overrides.startEngineCooldown;
  if (!startCooldown) {
    try {
      const engine = engineProvider();
      startCooldown = engine?.startCoolDown || null;
    } catch {
      startCooldown = null;
    }
  }
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
    isOrchestrated: overrides.isOrchestrated,
    getStateSnapshot: overrides.getStateSnapshot || getStateSnapshot,
    getClassicBattleMachine: overrides.getClassicBattleMachine
  };
  const engineStarter = engineProvider;
  const expectsEngineArgument =
    typeof overrides.startEngineCooldown === "function" &&
    overrides.startEngineCooldown.length >= 5;
  const callEngineStart = (engineInstance, onTick, onExpired, dur, onDrift) => {
    if (typeof startCooldown !== "function") return null;
    if (expectsEngineArgument) {
      return startCooldown(engineInstance, onTick, onExpired, dur, onDrift);
    }
    return startCooldown.call(engineInstance, onTick, onExpired, dur, onDrift);
  };
  const startEngineCooldownWithScheduler = (...args) => {
    if (typeof startCooldown !== "function") return null;
    const [maybeEngine, onTick, onExpired, dur, onDrift] =
      args.length >= 5 || (args.length > 0 && typeof args[0] !== "function")
        ? args
        : [null, ...args];
    let engineInstance = maybeEngine || null;
    if (!engineInstance) {
      if (engineStarter) {
        try {
          engineInstance = engineStarter();
        } catch {
          return null;
        }
      }
    }
    const originalTimer = engineInstance?.timer;
    const TimerCtor = originalTimer?.constructor;
    if (typeof TimerCtor !== "function") {
      return callEngineStart(engineInstance, onTick, onExpired, dur, onDrift);
    }
    const timerOptions = {
      ...(typeof originalTimer === "object" && originalTimer ? originalTimer : {})
    };
    if (scheduler) timerOptions.scheduler = scheduler;
    if (typeof originalTimer?.onSecondTick === "function") {
      timerOptions.onSecondTick = originalTimer.onSecondTick;
    }
    if (typeof originalTimer?.cancel === "function") {
      timerOptions.cancel = originalTimer.cancel;
    }
    let temporaryTimer;
    let startedSuccessfully = false;
    try {
      temporaryTimer = new TimerCtor(timerOptions);
    } catch {
      return callEngineStart(engineInstance, onTick, onExpired, dur, onDrift);
    }
    const restoreTimer = originalTimer;
    engineInstance.timer = temporaryTimer;
    try {
      const result = callEngineStart(engineInstance, onTick, onExpired, dur, onDrift);
      startedSuccessfully = true;
      return result;
    } finally {
      if (restoreTimer && temporaryTimer && typeof restoreTimer === "object") {
        try {
          Object.assign(restoreTimer, temporaryTimer);
        } catch {}
      }
      engineInstance.timer = restoreTimer;
      if (!startedSuccessfully && temporaryTimer && typeof temporaryTimer.stop === "function") {
        try {
          temporaryTimer.stop();
        } catch {}
      }
    }
  };
  const timer = timerFactory({ starter: startEngineCooldownWithScheduler });
  renderer(timer, cooldownSeconds);
  controls.timer = timer;
  const runtime = {
    timer,
    bus,
    fallbackScheduler,
    scheduler,
    scoreboardApi,
    snackbarApi,
    expirationOptions,
    registerSkipHandler,
    expired: false,
    fallbackId: null,
    schedulerFallbackId: null,
    finalizePromise: null
  };
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
  return runtime;
}

/**
 * @summary Configure expiration handlers that finalize cooldown readiness.
 * @param {{controls: ReturnType<typeof createCooldownControls>, btn: HTMLElement|null, runtime: any, handleExpiration: Function, getReadyDispatched: Function, appendTrace?: Function}} params
 * Runtime dependencies required to process expiration events.
 * @returns {Function} Callback used to handle timer expiration.
 * @pseudocode
 * 1. Wrap the control resolver to clear fallback timers and finalize state.
 * 2. Emit countdown completion events when the timer expires.
 * 3. Delegate to the shared expiration handler to perform readiness dispatch.
 */
export function createExpirationDispatcher({
  controls,
  btn,
  runtime,
  handleExpiration,
  getReadyDispatched,
  appendTrace
}) {
  const { bus, expirationOptions } = runtime;
  const originalResolveReady =
    typeof controls.resolveReady === "function" ? controls.resolveReady : null;
  const finalizeExpiration = (alreadyDispatchedReady = getReadyDispatched()) => {
    if (runtime.finalizePromise) {
      return runtime.finalizePromise;
    }
    const runPromise = handleExpiration(controls, btn, {
      ...expirationOptions,
      alreadyDispatchedReady
    })
      .then((result) => {
        if (result !== false) {
          runtime.finalizePromise = null;
        }
        return result;
      })
      .catch((error) => {
        runtime.finalizePromise = null;
        throw error;
      });
    runtime.finalizePromise = runPromise;
    return runPromise;
  };
  controls.resolveReady = function wrappedResolveReady(...args) {
    if (runtime.fallbackId) {
      clearTimeout(runtime.fallbackId);
      runtime.fallbackId = null;
    }
    safeRound(
      "wireCooldownTimer.resolveReady.clearSchedulerFallback",
      () => {
        if (runtime.schedulerFallbackId && runtime.scheduler?.clearTimeout) {
          runtime.scheduler.clearTimeout(runtime.schedulerFallbackId);
        }
      },
      { suppressInProduction: true }
    );
    runtime.schedulerFallbackId = null;
    if (!runtime.expired) {
      runtime.expired = true;
    }
    const finalizeResult = finalizeExpiration();
    const originalResult = originalResolveReady
      ? originalResolveReady.apply(this, args)
      : undefined;
    if (finalizeResult && typeof finalizeResult.then === "function") {
      return finalizeResult.then(() => originalResult);
    }
    return originalResult;
  };
  const onExpired = async () => {
    if (runtime.expired) {
      return finalizeExpiration();
    }
    runtime.expired = true;
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
  runtime.timer?.on?.("expired", onExpired);
  runtime.onExpired = onExpired;
  runtime.finalizeExpiration = finalizeExpiration;
  runtime.appendTrace = appendTrace || appendReadyTrace;
  return onExpired;
}

/**
 * @summary Register skip behaviour that finalises cooldown state immediately.
 * @param {{runtime: any, controls: ReturnType<typeof createCooldownControls>, btn: HTMLElement|null, handleExpiration: Function}} params
 * Runtime dependencies for skip handling.
 * @returns {void}
 * @pseudocode
 * 1. Install a skip handler that stops timers and clears fallbacks.
 * 2. Emit cooldown completion events when skip is triggered.
 * 3. Invoke the expiration handler to preserve consistent readiness flow.
 */
export function registerSkipHandlerForTimer({ runtime, controls, btn, handleExpiration }) {
  const { registerSkipHandler, bus, expirationOptions } = runtime;
  registerSkipHandler(() => {
    safeRound(
      "wireCooldownTimer.skip.warn",
      () => console.warn("[test] skip: stop nextRoundTimer"),
      { suppressInProduction: true }
    );
    if (runtime.fallbackId) {
      clearTimeout(runtime.fallbackId);
      runtime.fallbackId = null;
    }
    safeRound(
      "wireCooldownTimer.skip.clearSchedulerFallback",
      () => {
        if (runtime.schedulerFallbackId && runtime.scheduler?.clearTimeout) {
          runtime.scheduler.clearTimeout(runtime.schedulerFallbackId);
        }
      },
      { suppressInProduction: true }
    );
    runtime.schedulerFallbackId = null;
    runtime.timer?.stop?.();
    if (!runtime.expired) {
      runtime.expired = true;
      safeRound(
        "wireCooldownTimer.skip.emitCompletion",
        () => {
          bus.emit("cooldown.timer.expired");
          bus.emit("control.countdown.completed");
        },
        { suppressInProduction: true }
      );
      void handleExpiration(controls, btn, expirationOptions);
    }
  });
}

/**
 * @summary Schedule fallback timers to guarantee expiration delivery.
 * @param {{runtime: any, cooldownSeconds: number, onExpired: Function}} params - Runtime helpers.
 * @returns {void}
 * @pseudocode
 * 1. Derive the fallback timeout duration from the cooldown seconds.
 * 2. Install fallback timers using both injected and global schedulers.
 * 3. Invoke the expiration handler when fallbacks fire.
 */
export function scheduleCooldownFallbacks({ runtime, cooldownSeconds, onExpired }) {
  safeRound(
    "wireCooldownTimer.scheduleFallbacks",
    () => {
      const secsNum = Number(cooldownSeconds);
      const ms = Number.isFinite(secsNum) ? Math.max(0, secsNum * 1000) : 0;
      const scheduleFallbackTimer = () => {
        runtime.fallbackId = runtime.fallbackScheduler(ms, () => {
          safeRound(
            "wireCooldownTimer.fallback.clearSchedulerTimeout",
            () => {
              if (
                runtime.schedulerFallbackId &&
                typeof runtime.scheduler?.clearTimeout === "function"
              ) {
                runtime.scheduler.clearTimeout(runtime.schedulerFallbackId);
              }
              runtime.schedulerFallbackId = null;
            },
            { suppressInProduction: true }
          );
          onExpired();
        });
      };
      const hasCustomScheduler =
        runtime.scheduler && typeof runtime.scheduler.setTimeout === "function";
      if (hasCustomScheduler) {
        safeRound(
          "wireCooldownTimer.scheduleInjected",
          () => {
            runtime.schedulerFallbackId = runtime.scheduler.setTimeout(() => {
              safeRound(
                "wireCooldownTimer.scheduler.clearFallbackTimer",
                () => {
                  if (runtime.fallbackId) {
                    clearTimeout(runtime.fallbackId);
                    runtime.fallbackId = null;
                  }
                },
                { suppressInProduction: true }
              );
              onExpired();
            }, ms);
          },
          {
            fallback: () =>
              safeRound(
                "wireCooldownTimer.scheduleFallbackTimer.recover",
                () => {
                  if (!runtime.fallbackId) {
                    scheduleFallbackTimer();
                  }
                },
                { suppressInProduction: true }
              ),
            suppressInProduction: true
          }
        );
      }
      safeRound(
        hasCustomScheduler
          ? "wireCooldownTimer.scheduleFallbackTimer.withScheduler"
          : "wireCooldownTimer.scheduleFallbackTimer",
        () => {
          if (!runtime.fallbackId) {
            scheduleFallbackTimer();
          }
        },
        { suppressInProduction: true }
      );
    },
    { suppressInProduction: true }
  );
}

/**
 * @summary Start the cooldown timer while capturing diagnostic errors.
 * @param {{timer: any}} runtime - Runtime state containing the timer instance.
 * @param {number} cooldownSeconds - Cooldown duration in seconds.
 * @returns {void}
 * @pseudocode
 * 1. Attempt to start the timer with the provided duration.
 * 2. Log diagnostic errors when timer start throws in test environments.
 */
export function startTimerWithDiagnostics(runtime, cooldownSeconds) {
  safeRound(
    "wireCooldownTimer.startTimer",
    () => {
      runtime.timer?.start?.(cooldownSeconds);
    },
    {
      suppressInProduction: true,
      fallback: (error) => {
        console.error("[TEST DEBUG] controls.timer.start error", error);
      }
    }
  );
}
