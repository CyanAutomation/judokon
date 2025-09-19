import { dispatchBattleEvent as globalDispatchBattleEvent } from "../eventDispatcher.js";
import { readDebugState as globalReadDebugState } from "../debugHooks.js";

/**
 * Create a telemetry emitter for next-round expiration instrumentation.
 *
 * @param {object} [targets]
 * @param {(key: string, value: any) => void} [targets.exposeDebugState]
 * @param {(key: string, value: any) => void} [targets.debugExpose]
 * @param {() => Record<string, any>|null} [targets.getDebugBag]
 * @returns {{ emit: (key: string, value: any) => void, getDebugBag: () => Record<string, any>|null }}
 */
export function createExpirationTelemetryEmitter(targets = {}) {
  const { exposeDebugState, debugExpose, getDebugBag } = targets;
  const emit = (key, value) => {
    try {
      if (typeof exposeDebugState === "function") exposeDebugState(key, value);
    } catch (error) {
      console.debug("Failed to expose debug state:", error);
    }
    if (typeof getDebugBag === "function") {
      try {
        const bag = getDebugBag();
        if (bag && typeof bag === "object") {
          bag[key] = value;
        }
      } catch (error) {
        console.debug("Failed to update debug bag:", error);
      }
    }
    try {
      if (typeof debugExpose === "function") debugExpose(key, value);
    } catch (error) {
      console.debug("Failed to call debugExpose:", error);
    }
  };
  const safeGetDebugBag = () => {
    if (typeof getDebugBag !== "function") return null;
    try {
      const bag = getDebugBag();
      return bag && typeof bag === "object" ? bag : null;
    } catch {
      return null;
    }
  };
  return { emit, getDebugBag: safeGetDebugBag };
}

/**
 * Create a machine reader that surfaces orchestrator state for expiration logic.
 *
 * @param {object} [options]
 * @param {() => any} [options.getClassicBattleMachine]
 * @param {object} [dependencies]
 * @param {(key: string, value: any) => void} [dependencies.emitTelemetry]
 * @param {(key: string) => any} [dependencies.readDebugState]
 * @param {(key: string) => any} [dependencies.debugRead]
 * @returns {() => any}
 */
export function createMachineReader(options = {}, dependencies = {}) {
  const { getClassicBattleMachine } = options;
  const { emitTelemetry, readDebugState, debugRead } = dependencies;
  const readDebug = typeof readDebugState === "function" ? readDebugState : globalReadDebugState;
  const globalReader = typeof debugRead === "function" ? debugRead : undefined;
  if (typeof getClassicBattleMachine === "function") {
    return () => {
      try {
        const machine = getClassicBattleMachine();
        emitTelemetry?.("handleNextRoundMachineGetterOverride", machine);
        return machine;
      } catch {
        return null;
      }
    };
  }
  return () => {
    let getter = null;
    try {
      getter = readDebug?.("getClassicBattleMachine");
    } catch {}
    if (!getter && typeof globalReader === "function") {
      try {
        getter = globalReader("getClassicBattleMachine");
      } catch {}
    }
    emitTelemetry?.("handleNextRoundMachineGetter", {
      sourceReadDebug: typeof getter,
      hasGlobal: typeof globalReader === "function"
    });
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
    emitTelemetry?.("handleNextRoundMachineGetterResult", result);
    return result;
  };
}

/**
 * Build helpers that read machine state and await cooldown readiness.
 *
 * @param {object} params
 * @param {() => any} params.machineReader
 * @param {() => any} [params.getSnapshot]
 * @param {(machine: any) => string|null} params.getMachineState
 * @param {(state: string|null) => boolean} params.isCooldownState
 * @param {(key: string, value: any) => void} [params.emitTelemetry]
 * @returns {{ machineState: string|null, snapshotState: string|null, shouldResolve: () => boolean, waitForCooldown: (eventBus: any) => Promise<void> }}
 */
export function createMachineStateInspector(params) {
  const { machineReader, getSnapshot, getMachineState, isCooldownState, emitTelemetry } = params;
  const safeGetState = () => {
    try {
      return getMachineState(machineReader?.());
    } catch {
      emitTelemetry?.("handleNextRoundMachineReadError", true);
      return null;
    }
  };
  const safeGetSnapshot = () => {
    if (typeof getSnapshot !== "function") return null;
    try {
      const snapshot = getSnapshot();
      return snapshot && typeof snapshot === "object" ? (snapshot.state ?? null) : null;
    } catch {
      return null;
    }
  };
  const machineState = safeGetState();
  emitTelemetry?.("handleNextRoundMachineState", machineState ?? null);
  const snapshotState = safeGetSnapshot();
  emitTelemetry?.("handleNextRoundSnapshotState", snapshotState);
  const shouldResolve = () => {
    const state = safeGetState();
    if (isCooldownState(state)) return true;
    const snapshot = safeGetSnapshot();
    if (isCooldownState(snapshot)) return true;
    return false;
  };
  const waitForCooldown = async (eventBus) => {
    if (shouldResolve()) {
      emitTelemetry?.("handleNextRoundMachineStateAfterWait", safeGetState() ?? null);
      return;
    }
    await new Promise((resolve) => {
      let settled = false;
      const cleanup = (handler) => {
        if (settled) return;
        settled = true;
        if (handler) {
          try {
            eventBus?.off?.("battleStateChange", handler);
          } catch {}
        }
        resolve();
      };
      const handler = () => {
        if (!shouldResolve()) return;
        cleanup(handler);
      };
      eventBus?.on?.("battleStateChange", handler);
      if (shouldResolve()) {
        cleanup(handler);
      }
    });
    emitTelemetry?.("handleNextRoundMachineStateAfterWait", safeGetState() ?? null);
  };
  return { machineState, snapshotState, shouldResolve, waitForCooldown };
}

/**
 * Dispatch the ready event via available battle event dispatchers.
 *
 * @param {object} [options]
 * @param {(type: string) => any} [options.dispatchBattleEvent]
 * @returns {Promise<boolean>}
 */
export async function dispatchReadyViaBus(options = {}) {
  const dispatchers = [];
  const candidate = options.dispatchBattleEvent;
  if (typeof candidate === "function") {
    dispatchers.push(candidate);
  }
  if (typeof globalDispatchBattleEvent === "function" && globalDispatchBattleEvent !== candidate) {
    dispatchers.push(globalDispatchBattleEvent);
  }
  for (const dispatcher of dispatchers) {
    try {
      const result = dispatcher("ready");
      const resolved = await Promise.resolve(result);
      if (resolved !== false) {
        return true;
      }
    } catch {}
  }
  return false;
}

/**
 * Attempt to dispatch the ready event with a provided dispatcher.
 *
 * @param {object} params
 * @param {(type: string) => any} params.dispatchBattleEvent
 * @param {(key: string, value: any) => void} [params.emitTelemetry]
 * @param {() => Record<string, any>|null} [params.getDebugBag]
 * @returns {Promise<boolean>}
 */
export async function dispatchReadyWithOptions(params) {
  const { dispatchBattleEvent, emitTelemetry, getDebugBag } = params;
  if (typeof dispatchBattleEvent !== "function") return false;
  const info = {
    hasFn: true,
    name: dispatchBattleEvent.name || null,
    toStringLen:
      typeof dispatchBattleEvent.toString === "function" ? dispatchBattleEvent.toString().length : 0
  };
  emitTelemetry?.("handleNextRound_dispatchViaOptions_info", info);
  const bag = getDebugBag?.();
  if (bag) {
    bag.handleNextRound_dispatchViaOptions_info = info;
    bag.handleNextRound_dispatchViaOptions_count =
      (bag.handleNextRound_dispatchViaOptions_count || 0) + 1;
  }
  try {
    const result = dispatchBattleEvent("ready");
    const resolved = await Promise.resolve(result);
    const dispatched = resolved !== false;
    emitTelemetry?.("handleNextRound_dispatchViaOptions_result", dispatched);
    if (bag) {
      bag.handleNextRound_dispatchViaOptions_result = { dispatched };
    }
    return dispatched;
  } catch (error) {
    const payload = {
      message: error && error.message ? error.message : String(error)
    };
    emitTelemetry?.("handleNextRound_dispatchViaOptions_error", payload);
    if (bag) {
      bag.handleNextRound_dispatchViaOptions_error = payload;
    }
    return false;
  }
}

/**
 * Directly dispatch the ready event via the state machine when available.
 *
 * @param {object} params
 * @param {() => any} params.machineReader
 * @param {(key: string, value: any) => void} [params.emitTelemetry]
 * @returns {Promise<boolean>}
 */
export async function dispatchReadyDirectly(params) {
  const { machineReader, emitTelemetry } = params;
  let machine = null;
  try {
    machine = machineReader?.();
  } catch {}
  const info = {
    machineExists: !!machine,
    hasDispatch: typeof machine?.dispatch === "function"
  };
  emitTelemetry?.("handleNextRound_dispatchReadyDirectly_info", info);
  if (!info.hasDispatch) return false;
  try {
    const result = machine.dispatch("ready");
    await Promise.resolve(result);
    emitTelemetry?.("handleNextRound_dispatchReadyDirectly_result", true);
    return true;
  } catch (error) {
    const payload = error && error.message ? error.message : String(error);
    emitTelemetry?.("handleNextRound_dispatchReadyDirectly_error", payload);
    return false;
  }
}

/**
 * Sequentially execute dispatch strategies until one succeeds.
 *
 * @param {object} params
 * @param {boolean} [params.alreadyDispatchedReady]
 * @param {Array<() => Promise<boolean>|boolean>} [params.strategies]
 * @param {(key: string, value: any) => void} [params.emitTelemetry]
 * @returns {Promise<boolean>}
 */
export async function runReadyDispatchStrategies(params = {}) {
  const { alreadyDispatchedReady = false, strategies = [], emitTelemetry } = params;
  if (alreadyDispatchedReady) {
    emitTelemetry?.("handleNextRoundDispatchResult", true);
    return true;
  }
  for (const strategy of strategies) {
    if (typeof strategy !== "function") continue;
    try {
      const result = await Promise.resolve(strategy());
      if (result) {
        emitTelemetry?.("handleNextRoundDispatchResult", true);
        return true;
      }
    } catch {}
  }
  emitTelemetry?.("handleNextRoundDispatchResult", false);
  return false;
}

/**
 * Update DOM/UI affordances after the cooldown expires.
 *
 * @param {object} params
 * @param {() => boolean} params.isOrchestrated
 * @param {(btn: HTMLButtonElement|null|undefined) => void} params.markReady
 * @param {HTMLButtonElement|null|undefined} params.button
 * @param {Document|null|undefined} [params.documentRef]
 * @param {() => Promise<void>|void} [params.updateDebugPanel]
 * @returns {Promise<void>}
 */
export async function updateExpirationUi(params) {
  const { isOrchestrated, markReady, button, documentRef, updateDebugPanel } = params;
  const orchestrated = typeof isOrchestrated === "function" && isOrchestrated();
  if (!orchestrated) {
    let target = button || null;
    if (!target && documentRef) {
      try {
        target = documentRef.getElementById?.("next-button") || null;
      } catch {}
    }
    try {
      markReady?.(target);
    } catch {}
  }
  if (typeof updateDebugPanel === "function") {
    try {
      await updateDebugPanel();
    } catch {}
  }
}
