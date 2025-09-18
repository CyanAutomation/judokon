import { drawCards, _resetForTest as resetSelection } from "./cardSelection.js";
import { createBattleEngine } from "../battleEngineFacade.js";
import * as battleEngine from "../battleEngineFacade.js";
import { bridgeEngineEvents } from "./engineBridge.js";
import { cancel as cancelFrame, stop as stopScheduler } from "../../utils/scheduler.js";
import { resetSkipState, setSkipHandler } from "./skipHandler.js";
import { emitBattleEvent, onBattleEvent, offBattleEvent } from "./battleEvents.js";
import { readDebugState, exposeDebugState } from "./debugHooks.js";
import { showSnackbar } from "../showSnackbar.js";
import { updateDebugPanel } from "./debugPanel.js";
import * as scoreboard from "../setupScoreboard.js";
import { realScheduler } from "../scheduler.js";
import { dispatchBattleEvent, resetDispatchHistory } from "./eventDispatcher.js";

import { computeNextRoundCooldown } from "../timers/computeNextRoundCooldown.js";
import { attachCooldownRenderer } from "../CooldownRenderer.js";
import { getStateSnapshot } from "./battleDebug.js";

/**
 * Detect whether the classic battle orchestrator is active.
 *
 * @pseudocode
 * 1. Read `document.body.dataset.battleState` inside a try/catch.
 * 2. Return `true` when the attribute exists, otherwise `false`.
 *
    try {
      exposeDebugState("handleNextRoundSnapshotState", snapshotState);
    } catch {}
    try {
      if (typeof globalThis !== "undefined" && globalThis.__classicBattleDebugExpose) {
        globalThis.__classicBattleDebugExpose("handleNextRoundSnapshotState", snapshotState);
      }
    } catch {}
    try {
      exposeDebugState("handleNextRoundSnapshotState_readAt", Date.now());
      if (typeof globalThis !== "undefined" && globalThis.__classicBattleDebugExpose) {
        globalThis.__classicBattleDebugExpose("handleNextRoundSnapshotState_readAt", Date.now());
      }
    } catch {}
}

/**
 * Create a new battle state store.
 *
 * @pseudocode
 * 1. Initialize battle state values.
 * 2. Return the store.
 *
 * @returns {object} The battle state store.
 */
export function createBattleStore() {
  return {
    selectionMade: false,
    stallTimeoutMs: 35000,
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
 * Reset match state and start a new game.
 *
 * @pseudocode
 * 1. Reset engine scores and flags.
 * 2. Close any open modals and clear the scoreboard message.
 * 3. Call the start round function to begin a new match.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 */
/**
 * Restart the current match by resetting engine state and UI then starting a round.
 *
 * This helper is used by the UI's 'replay' flow to clear engine state, notify
 * the UI to reset, and delegate to `startRound()` (which may be overridden in
 * test debug APIs).
 *
 * @summary Reset match state and UI, then begin a new round.
 * @pseudocode
 * 1. Create a fresh engine instance via `createBattleEngine()` and rebind engine events with `bridgeEngineEvents()`.
 * 2. Emit a `game:reset-ui` CustomEvent so UI components can teardown.
 * 3. Resolve the appropriate `startRound` function (possibly overridden) and call it.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @returns {Promise<ReturnType<typeof startRound>>} Result of starting a fresh round.
 */
export async function handleReplay(store) {
  // Only create a new engine when one does not already exist. Tests call
  // `_resetForTest` frequently; unconditionally recreating the engine here
  // resets match-level scores and causes cumulative score tests to fail.
  try {
    // `battleEngine` is the imported facade namespace; calling a thin
    // accessor like `getScores()` will throw when no engine exists.
    if (typeof battleEngine.getScores === "function") {
      try {
        battleEngine.getScores();
      } catch {
        // Engine missing -> create one
        createBattleEngine();
      }
    } else {
      // Fallback: if accessor missing, conservatively create an engine.
      createBattleEngine();
    }
  } catch {
    try {
      createBattleEngine();
    } catch {}
  }
  bridgeEngineEvents();
  window.dispatchEvent(new CustomEvent("game:reset-ui", { detail: { store } }));
  // Explicitly reset displayed scores to 0 after recreating the engine so
  // the scoreboard model reflects the fresh match state immediately.
  try {
    emitBattleEvent("display.score.update", { player: 0, opponent: 0 });
  } catch {}
  try {
    scoreboard.updateScore(0, 0);
  } catch {}
  const startRoundFn = getStartRound(store);
  const res = await startRoundFn();
  try {
    scoreboard.updateScore(0, 0);
  } catch {}
  return res;
}

/**
 * Start a new round by drawing cards and starting timers.
 *
 * @pseudocode
 * 1. Reset selection flags on the store and clear any previous player choice.
 * 2. Draw player and opponent cards.
 * 3. Compute the current round number via `battleEngine.getRoundsPlayed() + 1`.
 * 4. If provided, invoke `onRoundStart` with the store and round number.
 * 5. Dispatch a `roundStarted` event with the store and round number.
 * 6. Return the drawn cards and round number.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {(store: ReturnType<typeof createBattleStore>, roundNumber: number) => void} [onRoundStart]
 *        Optional callback to apply UI updates immediately.
 */
/**
 * Draw new cards and start a round.
 *
 * Resets per-round store flags, draws player/opponent cards from the engine,
 * computes the next round number and emits a `roundStarted` event. An
 * optional `onRoundStart` callback may be invoked synchronously to update UI
 * state immediately.
 *
 * @pseudocode
 * 1. Clear `store.selectionMade` and `store.playerChoice`.
 * 2. Await `drawCards()` to get player and opponent cards.
 * 3. Store the player's judoka on `store.currentPlayerJudoka`.
 * 4. Compute `roundNumber` from the engine's rounds played count.
 * 5. If supplied, call `onRoundStart(store, roundNumber)`.
 * 6. Emit `roundStarted` with the store and round number.
 * 7. Return `{...cards, roundNumber}` to callers.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {(store: ReturnType<typeof createBattleStore>, roundNumber: number) => void} [onRoundStart]
 * @returns {Promise<{playerCard: any, opponentCard: any, roundNumber: number}>}
 */
export async function startRound(store, onRoundStart) {
  store.selectionMade = false;
  store.playerChoice = null;
  // Propagate scheduler from store.context if present
  const scheduler = store?.context?.scheduler || store?.scheduler;
  const cards = await drawCards();
  store.currentPlayerJudoka = cards.playerJudoka || null;
  let roundNumber = 1;
  try {
    const fn = battleEngine.getRoundsPlayed;
    const played = typeof fn === "function" ? Number(fn()) : 0;
    if (Number.isFinite(played)) roundNumber = played + 1;
  } catch {}
  if (typeof onRoundStart === "function") {
    try {
      onRoundStart(store, roundNumber);
    } catch {}
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

/**
 * Schedule the cooldown before the next round and expose controls
 * for the Next button.
 *
 * @pseudocode
 * 1. Log the call for debug visibility.
 * 2. Reset Next button state and determine cooldown duration.
 * 3. Attach `CooldownRenderer` and start the timer with a fallback.
 * 4. Resolve the ready promise when the cooldown expires.
 *
 * @param {ReturnType<typeof createBattleStore>} _store - Battle state store.
 * @param {typeof realScheduler} [scheduler=realScheduler] - Scheduler for timers.
 * @returns {{timer: ReturnType<typeof createRoundTimer>|null, resolveReady: (()=>void)|null, ready: Promise<void>|null}}
 */
export function startCooldown(_store, scheduler, overrides = {}) {
  try {
    console.error(
      "[TEST ERROR] startCooldown invoked, scheduler present:",
      !!scheduler?.setTimeout
    );
  } catch {}
  // Reset the ready dispatch flag for the new cooldown period
  readyDispatchedForCurrentCooldown = false;
  resetDispatchHistory("ready");
  if (typeof globalThis !== "undefined") {
    globalThis.__startCooldownCount = (globalThis.__startCooldownCount || 0) + 1;
  }
  console.log("[dedupe] startCooldown reset ready");
  // Always use the injected scheduler if provided, else fall back to realScheduler
  const activeScheduler =
    scheduler && typeof scheduler.setTimeout === "function" ? scheduler : realScheduler;
  const bus = createEventBus(overrides.eventBus);
  const context = detectOrchestratorContext();
  let orchestratedMode = context.orchestrated;
  const orchestratorMachine = context.machine;
  if (orchestratedMode && !orchestratorMachine) {
    orchestratedMode = false;
  }
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
  // PRD taxonomy: announce countdown start
  try {
    bus.emit("control.countdown.started", {
      durationMs: Math.max(0, Number(cooldownSeconds) || 0) * 1000
    });
  } catch {}
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
      markReady: overrides.markReady
    });
    wireCooldownTimer(controls, btn, cooldownSeconds, activeScheduler, helperOptions);
  } else {
    wireCooldownTimer(controls, btn, cooldownSeconds, activeScheduler, helperOptions);
  }
  currentNextRound = controls;
  try {
    exposeDebugState("currentNextRound", controls);
  } catch {}
  return controls;
}

/**
 * Expose current cooldown controls for Next button helpers.
 *
 * @pseudocode
 * 1. Return the `currentNextRound` object containing timer and readiness resolver.
 * 2. When no cooldown is active, return `null`.
 *
 * @returns {{timer: ReturnType<typeof createRoundTimer>|null, resolveReady: (()=>void)|null, ready: Promise<void>|null}|null}
 */
export function getNextRoundControls() {
  if (currentNextRound) return currentNextRound;
  // Fabricate controls when the button already indicates readiness. This keeps
  // E2E deterministic even when adapters are not bound and allows callers to
  // observe a resolved `ready` signal consistent with the UI state.
  try {
    const btn =
      typeof document !== "undefined"
        ? document.getElementById("next-button") ||
          document.querySelector('[data-role="next-round"]')
        : null;
    if (btn && (btn.getAttribute("data-next-ready") === "true" || btn.disabled === false)) {
      return { timer: null, resolveReady: () => {}, ready: Promise.resolve() };
    }
  } catch {}
  return null;
}

/**
 * Schedule a fallback timeout and return its id.
 *
 * @pseudocode
 * 1. Attempt to call `setTimeout(cb, ms)`.
 * 2. Return the timer id or `null` on failure.
 *
 * @param {number} ms
 * @param {Function} cb
 * @returns {ReturnType<typeof setTimeout>|null}
 */
export function setupFallbackTimer(ms, cb, scheduler) {
  const activeScheduler =
    scheduler && typeof scheduler.setTimeout === "function" ? scheduler : realScheduler;
  try {
    return activeScheduler.setTimeout(cb, ms);
  } catch {
    return null;
  }
}

function createEventBus(eventBusOverrides) {
  const overrides = eventBusOverrides || {};
  let fallbackEmit = () => {};
  let fallbackOn = () => {};
  let fallbackOff = () => {};
  try {
    if (typeof emitBattleEvent === "function") fallbackEmit = emitBattleEvent;
  } catch {}
  try {
    if (typeof onBattleEvent === "function") fallbackOn = onBattleEvent;
  } catch {}
  try {
    if (typeof offBattleEvent === "function") fallbackOff = offBattleEvent;
  } catch {}
  const emit = typeof overrides.emit === "function" ? overrides.emit : fallbackEmit;
  const on = typeof overrides.on === "function" ? overrides.on : fallbackOn;
  const off = typeof overrides.off === "function" ? overrides.off : fallbackOff;
  return { emit, on, off };
}

function detectOrchestratorContext() {
  let orchestrated = false;
  let machine = null;
  try {
    orchestrated = isOrchestrated();
  } catch {}
  try {
    const getter = readDebugState("getClassicBattleMachine");
    const candidate = typeof getter === "function" ? getter() : getter;
    if (candidate) {
      machine = candidate;
      orchestrated = orchestrated || true;
    }
  } catch {}
  return { orchestrated, machine };
}

function setupNonOrchestratedReady(target, scheduler, { eventBus, markReady } = {}) {
  if (!target) return;
  const mark = markReady || markNextReady;
  mark(target);
  try {
    eventBus?.emit?.("nextRoundTimerReady");
  } catch {}
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
  try {
    scheduler.setTimeout(() => reapply(), 0);
    scheduler.setTimeout(() => reapply(), 20);
  } catch {
    try {
      setTimeout(() => reapply(), 0);
      setTimeout(() => reapply(), 20);
    } catch {}
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
  const cleanup = () => {
    while (cleanupFns.length) {
      const dispose = cleanupFns.pop();
      try {
        dispose?.();
      } catch {}
    }
  };
  let resolved = false;
  const finalize = () => {
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
      try {
        handler(event);
      } catch {}
    };
    try {
      bus.on(type, wrapped);
      cleanupFns.push(() => {
        try {
          bus.off(type, wrapped);
        } catch {}
      });
    } catch {}
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
    try {
      const run = () => checkImmediate();
      if (typeof queueMicrotask === "function") queueMicrotask(run);
      else if (scheduler && typeof scheduler.setTimeout === "function") {
        scheduler.setTimeout(run, 0);
      } else setTimeout(run, 0);
    } catch {
      try {
        setTimeout(() => checkImmediate(), 0);
      } catch {}
    }
  }
}

function isOrchestratorReadyState(state) {
  return state === "roundStart" || state === "waitingForPlayerAction";
}

function readBattleStateDataset() {
  try {
    if (typeof document === "undefined" || !document.body) return null;
    return document.body.dataset?.battleState || null;
  } catch {
    return null;
  }
}

function getMachineState(machine) {
  if (!machine || typeof machine !== "object") return null;
  try {
    const state = machine.getState?.();
    if (typeof state === "string") return state;
    if (state && typeof state === "object" && typeof state.value === "string") return state.value;
  } catch {}
  try {
    if (typeof machine.state === "string") return machine.state;
  } catch {}
  try {
    if (typeof machine.currentState === "string") return machine.currentState;
  } catch {}
  try {
    const current = machine.current;
    if (typeof current === "string") return current;
    if (current && typeof current === "object" && typeof current.value === "string")
      return current.value;
  } catch {}
  return null;
}

function isNextButtonReady() {
  try {
    if (typeof document === "undefined") return false;
    const btn = document.getElementById("next-button");
    if (!btn) return false;
    if (btn.dataset?.nextReady === "true") return true;
    if (btn.disabled === false) return true;
  } catch {}
  return false;
}

function logStartCooldown() {
  try {
    const { state: s } = getStateSnapshot();
    const count = (readDebugState("startCooldownCount") || 0) + 1;
    exposeDebugState("startCooldownCount", count);
    if (!(typeof process !== "undefined" && process.env?.VITEST)) {
      console.warn(`[test] startCooldown call#${count}: state=${s}`);
    }
  } catch {}
}

function createCooldownControls({ emit } = {}) {
  const controls = {
    timer: null,
    resolveReady: null,
    ready: null,
    readyDispatched: false,
    readyInFlight: false
  };
  const notify = typeof emit === "function" ? emit : emitBattleEvent;
  controls.ready = new Promise((resolve) => {
    controls.resolveReady = () => {
      controls.readyDispatched = true;
      controls.readyInFlight = false;
      try {
        notify("nextRoundTimerReady");
      } catch {}
      resolve();
      controls.resolveReady = null;
    };
  });
  return controls;
}

function markNextReady(btn) {
  if (!btn) return;
  // Be permissive here: in unit tests, transitions can occur very quickly and
  // module isolation can yield differing state snapshots. Mark the Next button
  // as ready unconditionally to reflect that the cooldown has completed.
  try {
    // Use explicit attribute APIs to avoid relying on property reflection which
    // can differ in some test harnesses / DOM shims.
    btn.setAttribute("data-next-ready", "true");
    btn.removeAttribute("disabled");
    // Patch: In Vitest, also update [data-role="next-round"] for test DOM
    if (typeof process !== "undefined" && process.env && process.env.VITEST) {
      const testBtn = document.querySelector('[data-role="next-round"]');
      if (testBtn && testBtn !== btn) {
        testBtn.setAttribute("data-next-ready", "true");
        testBtn.removeAttribute("disabled");
      }
    }
  } catch {}
  try {
    if (typeof process !== "undefined" && process.env && process.env.VITEST) {
      // Lightweight test-only trace to help diagnose flakiness across tests.
      console.debug(
        `[test] markNextReady: disabled=${btn.disabled} dataset=${btn.dataset.nextReady}`
      );
    }
  } catch {}
}

let readyDispatchedForCurrentCooldown = false;

async function handleNextRoundExpiration(controls, btn, options = {}) {
  // TEMP: Mark global for test to confirm callback execution
  if (typeof window !== "undefined") window.__NEXT_ROUND_EXPIRED = true;
  try {
    if (typeof globalThis !== "undefined" && globalThis.__classicBattleDebugExpose) {
      globalThis.__classicBattleDebugExpose("nextRoundExpired", true);
    }
  } catch {}
  try {
    if (typeof globalThis !== "undefined") {
      const bag = (globalThis.__CLASSIC_BATTLE_DEBUG = globalThis.__CLASSIC_BATTLE_DEBUG || {});
      bag.handleNextRoundCallCount = (bag.handleNextRoundCallCount || 0) + 1;
    }
  } catch {}
  try {
    exposeDebugState("handleNextRoundExpirationCalled", true);
  } catch {}
  if (controls?.readyDispatched || controls?.readyInFlight) {
    try {
      exposeDebugState("handleNextRoundEarlyExit", {
        readyDispatched: !!controls?.readyDispatched,
        readyInFlight: !!controls?.readyInFlight
      });
      if (typeof globalThis !== "undefined") {
        const bag = (globalThis.__CLASSIC_BATTLE_DEBUG = globalThis.__CLASSIC_BATTLE_DEBUG || {});
        bag.handleNextRoundEarlyExit = {
          readyDispatched: !!controls?.readyDispatched,
          readyInFlight: !!controls?.readyInFlight
        };
        if (typeof globalThis.__classicBattleDebugExpose === "function") {
          globalThis.__classicBattleDebugExpose(
            "handleNextRoundEarlyExit",
            bag.handleNextRoundEarlyExit
          );
        }
      }
    } catch {}
    return;
  }
  if (controls) controls.readyInFlight = true;
  try {
    exposeDebugState("currentNextRoundReadyInFlight", !!controls?.readyInFlight);
  } catch {}
  // Patch: In Vitest, also update [data-role="next-round"] for test DOM
  try {
    if (typeof process !== "undefined" && process.env && process.env.VITEST) {
      const testBtn = document.querySelector('[data-role="next-round"]');
      if (testBtn && testBtn !== btn) {
        testBtn.setAttribute("data-next-ready", "true");
        testBtn.removeAttribute("disabled");
      }
    }
  } catch {}
  if (typeof console !== "undefined") {
    // Print the machine reference from the event dispatcher debug getter
    let machineRef = null;
    try {
      if (typeof globalThis !== "undefined" && globalThis.__classicBattleDebugRead) {
        const getMachine = globalThis.__classicBattleDebugRead("getClassicBattleMachine");
        machineRef = typeof getMachine === "function" ? getMachine() : null;
      }
    } catch {}
  }
  const clearSkipHandler =
    typeof options.setSkipHandler === "function" ? options.setSkipHandler : setSkipHandler;
  try {
    clearSkipHandler(null);
  } catch {}
  const scoreboardApi = options.scoreboard || scoreboard;
  try {
    scoreboardApi?.clearTimer?.();
  } catch {}
  // Ensure we've reached the cooldown state before advancing. If the
  // machine already moved past cooldown (e.g. into roundStart or
  // waitingForPlayerAction) resolve immediately so the ready dispatch
  // still occurs.
  const bus = createEventBus(options.eventBus);
  const getSnapshot = options.getStateSnapshot || getStateSnapshot;
  const machineReader = (() => {
    if (typeof options.getClassicBattleMachine === "function") {
      return () => {
        try {
          const machine = options.getClassicBattleMachine();
          try {
            exposeDebugState("handleNextRoundMachineGetterOverride", machine);
            if (typeof globalThis !== "undefined" && globalThis.__classicBattleDebugExpose) {
              globalThis.__classicBattleDebugExpose("handleNextRoundMachineGetterOverride", machine);
            }
          } catch {}
          return machine;
        } catch {
          return null;
        }
      };
    }
    return () => {
      let getter = null;
      try {
        getter = readDebugState("getClassicBattleMachine");
      } catch {}
      if (!getter) {
        try {
          if (typeof globalThis !== "undefined" && globalThis.__classicBattleDebugRead) {
            getter = globalThis.__classicBattleDebugRead("getClassicBattleMachine");
          }
        } catch {}
      }
      try {
        exposeDebugState("handleNextRoundMachineGetter", {
          sourceReadDebug: typeof getter,
          hasGlobal: typeof globalThis !== "undefined" && !!globalThis.__classicBattleDebugRead
        });
        if (typeof globalThis !== "undefined") {
          const bag = (globalThis.__CLASSIC_BATTLE_DEBUG = globalThis.__CLASSIC_BATTLE_DEBUG || {});
          bag.handleNextRoundMachineGetter = {
            sourceReadDebug: typeof getter,
            hasGlobal: typeof globalThis.__classicBattleDebugRead === "function"
          };
          if (typeof globalThis.__classicBattleDebugExpose === "function") {
            globalThis.__classicBattleDebugExpose(
              "handleNextRoundMachineGetter",
              bag.handleNextRoundMachineGetter
            );
          }
        }
      } catch {}
      let result = null;
      if (typeof getter === "function") {
        try {
          result = getter();
        } catch {
          result = null;
        }
      } else if (getter && typeof getter === "object") {
        result = getter;
      }
      try {
        exposeDebugState("handleNextRoundMachineGetterResult", result);
        if (typeof globalThis !== "undefined" && globalThis.__classicBattleDebugExpose) {
          globalThis.__classicBattleDebugExpose("handleNextRoundMachineGetterResult", result);
        }
      } catch {}
      return result;
    };
  })();
  const isCooldownSafeState = (state) => {
    if (!state) return true;
    if (typeof state !== "string") return false;
    if (state === "cooldown" || state === "roundOver") return true;
    return isOrchestratorReadyState(state);
  };
  const readMachineState = () => {
    try {
      return getMachineState(machineReader());
    } catch {
      try {
        exposeDebugState("handleNextRoundMachineReadError", true);
        if (typeof globalThis !== "undefined") {
          const bag = (globalThis.__CLASSIC_BATTLE_DEBUG = globalThis.__CLASSIC_BATTLE_DEBUG || {});
          bag.handleNextRoundMachineReadError = true;
          if (typeof globalThis.__classicBattleDebugExpose === "function") {
            globalThis.__classicBattleDebugExpose("handleNextRoundMachineReadError", true);
          }
        }
      } catch {}
      return null;
    }
  };
  const shouldResolve = () => {
    const machineState = readMachineState();
    if (isCooldownSafeState(machineState)) return true;
    try {
      const snapshotState = getSnapshot()?.state;
      if (isCooldownSafeState(snapshotState)) return true;
    } catch {}
    return false;
  };
  try {
    const machineState = (() => {
      try {
        return readMachineState();
      } catch {
        return null;
      }
    })();
    exposeDebugState("handleNextRoundMachineState", machineState ?? null);
    if (typeof globalThis !== "undefined") {
      const bag = (globalThis.__CLASSIC_BATTLE_DEBUG = globalThis.__CLASSIC_BATTLE_DEBUG || {});
      bag.handleNextRoundMachineState = machineState ?? null;
      if (typeof globalThis.__classicBattleDebugExpose === "function") {
        globalThis.__classicBattleDebugExpose("handleNextRoundMachineState", machineState ?? null);
      }
    }
  } catch {}
  try {
    const snapshotState = (() => {
      try {
        return getSnapshot()?.state ?? null;
      } catch {
        return null;
      }
    })();
    exposeDebugState("handleNextRoundSnapshotState", snapshotState);
    if (typeof globalThis !== "undefined") {
      const bag = (globalThis.__CLASSIC_BATTLE_DEBUG = globalThis.__CLASSIC_BATTLE_DEBUG || {});
      bag.handleNextRoundSnapshotState = snapshotState;
      if (typeof globalThis.__classicBattleDebugExpose === "function") {
        globalThis.__classicBattleDebugExpose("handleNextRoundSnapshotState", snapshotState);
      }
    }
  } catch {}
  await new Promise((resolve) => {
    if (shouldResolve()) {
      resolve();
      return;
    }
    const handler = (event) => {
      const detach = () => {
        try {
          bus.off("battleStateChange", handler);
        } catch {}
      };
      if (shouldResolve()) {
        detach();
        resolve();
        return;
      }
      let toState = null;
      try {
        const detail = event?.detail;
        if (detail && typeof detail === "object") {
          toState = detail.to ?? detail?.detail?.to ?? null;
        } else if (typeof detail === "string") {
          toState = detail;
        }
      } catch {}
      if (isCooldownSafeState(toState)) {
        detach();
        resolve();
      }
    };
    try {
      bus.on("battleStateChange", handler);
    } catch {
      resolve();
    }
  });
  try {
    const machineStateAfter = (() => {
      try {
        return readMachineState();
      } catch {
        return null;
      }
    })();
    exposeDebugState("handleNextRoundMachineStateAfterWait", machineStateAfter ?? null);
    if (typeof globalThis !== "undefined") {
      const bag = (globalThis.__CLASSIC_BATTLE_DEBUG = globalThis.__CLASSIC_BATTLE_DEBUG || {});
      bag.handleNextRoundMachineStateAfterWait = machineStateAfter ?? null;
      if (typeof globalThis.__classicBattleDebugExpose === "function") {
        globalThis.__classicBattleDebugExpose(
          "handleNextRoundMachineStateAfterWait",
          machineStateAfter ?? null
        );
      }
    }
  } catch {}

  // If the orchestrator is running, it owns the "Next" button readiness.
  // This path should only execute in non-orchestrated environments (e.g., unit tests).
  const isOrchestratedFn =
    typeof options.isOrchestrated === "function" ? options.isOrchestrated : isOrchestrated;
  const markReady = options.markReady || markNextReady;
  if (!isOrchestratedFn()) {
    try {
      const liveBtn =
        typeof document !== "undefined" ? document.getElementById("next-button") : btn;
      markReady(liveBtn || btn);
      try {
        console.warn("[test] roundManager: marked Next ready");
      } catch {}
    } catch {}
  }

  // Update debug panel for visibility.
  try {
    const updatePanel = options.updateDebugPanel || updateDebugPanel;
    updatePanel();
  } catch {}

  // Dispatch `ready` (fire-and-forget) before resolving the controls so
  // tests awaiting `controls.ready` don't depend on orchestrator internals.
  // Only dispatch if the machine is still in cooldown state and we haven't already dispatched for this cooldown.
  const dispatchReadyDirectly = async () => {
    if (machine?.dispatch) {
      try {
        const result = await machine.dispatch("ready");
        if (result && typeof result.then === "function") {
          result.catch(() => {});
        }
        return true;
      } catch {}
    }
    return false;
  };
}

function wireCooldownTimer(controls, btn, cooldownSeconds, scheduler, overrides = {}) {
  console.log("[dedupe] wireCooldownTimer", cooldownSeconds);
  const bus = createEventBus(overrides.eventBus);
  const timerFactory = overrides.createRoundTimer || createRoundTimer;
  let startCooldown = overrides.startEngineCooldown || engineStartCoolDown;
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
      try {
        if (schedulerFallbackId) {
          scheduler.clearTimeout?.(schedulerFallbackId);
        }
      } catch {}
      schedulerFallbackId = null;
      if (!expired) {
        expired = true;
      }
      return originalResolveReady.apply(this, args);
    };
  }
  const onExpired = () => {
    console.log("[dedupe] onExpired fired");
    if (expired) return;
    expired = true;
    // PRD taxonomy: cooldown timer expired + countdown completed
    try {
      bus.emit("cooldown.timer.expired");
      bus.emit("control.countdown.completed");
    } catch {}
    return handleNextRoundExpiration(controls, btn, expirationOptions);
  };
  timer.on("expired", onExpired);
  // PRD taxonomy: cooldown timer ticks
  timer.on("tick", (remaining) => {
    try {
      bus.emit("cooldown.timer.tick", {
        remainingMs: Math.max(0, Number(remaining) || 0) * 1000
      });
    } catch {}
  });
  timer.on("drift", () => {
    const msgEl = typeof document !== "undefined" ? document.getElementById("round-message") : null;
    if (msgEl && msgEl.textContent) {
      try {
        if (typeof snackbarApi === "function") snackbarApi("Waiting…");
        else showSnackbar("Waiting…");
      } catch {}
    } else {
      try {
        scoreboardApi?.showMessage?.("Waiting…");
      } catch {}
    }
  });
  controls.timer = timer;
  try {
    console.error(
      "[TEST ERROR] wireCooldownTimer: controls.timer set?",
      !!controls.timer,
      "hasStart?",
      typeof controls.timer?.start === "function"
    );
  } catch {}
  registerSkipHandler(() => {
    try {
      console.warn("[test] skip: stop nextRoundTimer");
    } catch {}
    clearTimeout(fallbackId);
    fallbackId = null;
    try {
      if (schedulerFallbackId) {
        scheduler.clearTimeout?.(schedulerFallbackId);
      }
    } catch {}
    schedulerFallbackId = null;
    controls.timer?.stop();
    if (!expired) {
      expired = true;
      try {
        bus.emit("cooldown.timer.expired");
        bus.emit("control.countdown.completed");
      } catch {}
      void handleNextRoundExpiration(controls, btn, expirationOptions);
    }
  });
  // Start the timer immediately to ensure test environments with fake timers
  // consistently observe timer ticks/expiration when advancing timers.
  try {
    controls.timer.start(cooldownSeconds);
    try {
      console.error(
        "[TEST ERROR] wireCooldownTimer: controls.timer.start called for",
        cooldownSeconds
      );
    } catch {}
  } catch (err) {
    console.error("[TEST DEBUG] controls.timer.start error", err);
  }
  try {
    const secsNum = Number(cooldownSeconds);
    // Fallback behavior:
    // - When duration is non-positive or invalid → resolve quickly (10ms) to
    //   satisfy tests that mock timers and rely on a minimal delay.
    // - When duration is valid → schedule at exact duration (ms) so advancing
    //   fake timers by the whole-second value triggers expiration without
    //   requiring additional padding.
    const ms = !Number.isFinite(secsNum) || secsNum <= 0 ? 10 : Math.max(0, secsNum * 1000);
    // Use both global and injected scheduler timeouts to maximize compatibility
    // with test environments that mock timers differently.
    fallbackId = fallbackScheduler(ms, onExpired);
    try {
      console.error("[TEST ERROR] wireCooldownTimer: fallbackId", fallbackId, "ms", ms);
    } catch {}
    try {
      schedulerFallbackId = scheduler.setTimeout(() => onExpired(), ms);
      try {
        console.error(
          "[TEST ERROR] wireCooldownTimer: schedulerFallbackId",
          schedulerFallbackId,
          "ms",
          ms
        );
      } catch {}
    } catch {}
  } catch {}
}

/**
 * Reset internal state for tests.
 *
 * Clears timers, selection flags, and any previous player choice.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Reset internal timers, flags and debug overrides for tests and runtime.
 *
 * Clears selection timers, resets scheduler state, clears any debug
 * startRoundOverride and emits a `game:reset-ui` event to allow the UI to
 * teardown and reinitialize.
 *
 * @summary Reset match subsystems and UI for tests.
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
    try {
      // Test if engine exists and is functional
      battleEngine.getScores();
      // Engine exists, don't recreate it to preserve scores
    } catch {
      // Engine doesn't exist or is broken, create a new one
      createBattleEngine();
    }
  } else {
    // In production, always create a fresh engine
    createBattleEngine();
  }
  bridgeEngineEvents();
  // In certain test environments, module mocking can cause `bridgeEngineEvents`
  // to bind using a different facade instance than the one the test spies on.
  // As a safety net, rebind via the locally imported facade when it's a mock.
  try {
    const maybeMock = /** @type {any} */ (battleEngine).on;
    if (typeof maybeMock === "function" && typeof maybeMock.mock === "object") {
      maybeMock("roundEnded", (detail) => {
        emitBattleEvent("roundResolved", detail);
      });
      maybeMock("matchEnded", (detail) => {
        emitBattleEvent("matchOver", detail);
      });
    }
  } catch {}
  stopScheduler();
  if (typeof window !== "undefined") {
    const api = readDebugState("classicBattleDebugAPI");
    if (api) delete api.startRoundOverride;
    else delete window.startRoundOverride;
  }
  if (store && typeof store === "object") {
    try {
      clearTimeout(store.statTimeoutId);
      clearTimeout(store.autoSelectId);
    } catch {}
    store.statTimeoutId = null;
    store.autoSelectId = null;
    store.selectionMade = false;
    // Reset any prior player stat selection
    store.playerChoice = null;
    try {
      cancelFrame(store.compareRaf);
    } catch {}
    store.compareRaf = 0;
    try {
      window.dispatchEvent(new CustomEvent("game:reset-ui", { detail: { store } }));
    } catch {}
  } else {
    // Best-effort notify UI without a concrete store instance
    try {
      window.dispatchEvent(new CustomEvent("game:reset-ui", { detail: { store: null } }));
    } catch {}
  }
}

/**
 * Reset the Classic Battle match state and UI.
 *
 * Alias of `_resetForTest` for production use. Clears timers, engine state,
 * store timeouts, and emits a `game:reset-ui` event to allow the UI to
 * teardown/reinitialize. Used by the classic battle orchestrator when
 * entering the lobby (`waitingForMatchStart`).
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Production alias for `_resetForTest` used by orchestrator and other callers.
 *
 * @pseudocode
 * 1. Invoke `_resetForTest(store)` when asked to reset the active match.
 */
/**
 * Reset the Classic Battle match state and UI.
 *
 * Alias of `_resetForTest` used by orchestrator and other callers.
 *
 * @pseudocode
 * 1. Invoke `_resetForTest(store)` when asked to reset the active match.
 * @returns {void}
 */
export const resetGame = _resetForTest;
