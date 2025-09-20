import { dispatchBattleEvent as globalDispatchBattleEvent } from "../eventDispatcher.js";
import { readDebugState as globalReadDebugState } from "../debugHooks.js";

/**
 * Create a telemetry emitter for next-round expiration instrumentation.
 *
 * @summary Builds a defensive telemetry helper that fans out debug values to
 * configured instrumentation hooks and shared bags.
 *
 * @pseudocode
 * 1. Destructure the optional debug targets and create a safe console logger.
 * 2. Define `emit` to call `exposeDebugState`, update a debug bag, and invoke
 *    `debugExpose`, swallowing failures.
 * 3. Define `safeGetDebugBag` to return the bag object when available or null
 *    on errors.
 * 4. Return both helpers so callers can publish telemetry and inspect the bag.
 *
 * @param {object} [targets]
 * @param {(key: string, value: any) => void} [targets.exposeDebugState]
 * @param {(key: string, value: any) => void} [targets.debugExpose]
 * @param {() => Record<string, any>|null} [targets.getDebugBag]
 * @returns {{ emit: (key: string, value: any) => void, getDebugBag: () => Record<string, any>|null }}
 */
export function createExpirationTelemetryEmitter(targets = {}) {
  const { exposeDebugState, debugExpose, getDebugBag } = targets;
  const logDebug = (message, error) => {
    try {
      if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
        console.debug(message, error);
      }
    } catch {
      // Silently ignore environment check failures
    }
  };
  const emit = (key, value) => {
    try {
      if (typeof exposeDebugState === "function") exposeDebugState(key, value);
    } catch (error) {
      logDebug("Failed to expose debug state:", error);
    }
    if (typeof getDebugBag === "function") {
      try {
        const bag = getDebugBag();
        if (bag && typeof bag === "object") {
          bag[key] = value;
        }
      } catch (error) {
        logDebug("Failed to update debug bag:", error);
      }
    }
    try {
      if (typeof debugExpose === "function") debugExpose(key, value);
    } catch (error) {
      logDebug("Failed to call debugExpose:", error);
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
 * @summary Produces a getter that returns the classic battle state machine from
 * caller overrides, debug hooks, or global readers while emitting telemetry.
 *
 * @pseudocode
 * 1. If an explicit `getClassicBattleMachine` option exists, wrap it with
 *    telemetry and return early.
 * 2. Otherwise read a getter via provided `readDebugState` or the global debug
 *    reader fallback.
 * 3. Emit telemetry describing the getter source and the resolved machine.
 * 4. Invoke and normalize the getter result, returning the machine or null.
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
      let machine = null;
      try {
        machine = getClassicBattleMachine();
      } catch {
        machine = null;
      }
      emitTelemetry?.("handleNextRoundMachineGetter", {
        sourceReadDebug: typeof getClassicBattleMachine,
        hasGlobal: typeof globalReader === "function",
        override: true
      });
      emitTelemetry?.("handleNextRoundMachineGetterOverride", machine);
      emitTelemetry?.("handleNextRoundMachineGetterResult", machine);
      return machine;
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
 * @summary Generates inspectors that capture machine and snapshot states and
 * provide async waiting until cooldown states are reached.
 *
 * @pseudocode
 * 1. Create guarded accessors that read the machine state and snapshot, logging
 *    telemetry when reads fail.
 * 2. Capture initial state values and emit telemetry for the machine and
 *    snapshot.
 * 3. Implement `shouldResolve` to check whether either state represents a
 *    cooldown condition.
 * 4. Implement `waitForCooldown` that subscribes to the event bus, resolves
 *    once cooldown is observed, and emits final telemetry.
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
  const emitPostWaitStates = () => {
    const latestMachineState = safeGetState() ?? null;
    const latestSnapshotState = safeGetSnapshot();
    emitTelemetry?.("handleNextRoundMachineStateAfterWait", latestMachineState);
    emitTelemetry?.("handleNextRoundSnapshotStateAfterWait", latestSnapshotState);
  };
  const waitForCooldown = async (eventBus) => {
    if (shouldResolve()) {
      emitPostWaitStates();
      return;
    }
    await new Promise((resolve) => {
      if (shouldResolve()) {
        resolve();
        return;
      }
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
      let subscribed = false;
      try {
        eventBus?.on?.("battleStateChange", handler);
        subscribed = true;
      } catch {}
      if (shouldResolve()) {
        cleanup(subscribed ? handler : undefined);
      }
    });
    emitPostWaitStates();
  };
  return { machineState, snapshotState, shouldResolve, waitForCooldown };
}

/**
 * Dispatch the ready event via available battle event dispatchers.
 *
 * @summary Attempts to trigger the "ready" event using provided and global
 * dispatchers until one succeeds or short-circuits when already dispatched.
 *
 * @pseudocode
 * 1. Collect the candidate dispatcher from options and include the global
 *    dispatcher when distinct.
 * 2. Invoke each dispatcher with the "ready" event, awaiting promises.
 * 3. Return `true` as soon as a dispatcher resolves without returning `false`.
 * 4. If all attempts fail, return `false`.
 *
 * @param {object} [options]
 * @param {(type: string) => any} [options.dispatchBattleEvent]
 * @param {boolean} [options.skipCandidate]
 * @param {boolean} [options.alreadyDispatched] True when the ready event was
 * already emitted and re-dispatching should be skipped.
 * @returns {Promise<boolean>}
 */
export async function dispatchReadyViaBus(options = {}) {
  const dispatchers = [];
  const candidate = options.dispatchBattleEvent;
  const skipCandidate = options.skipCandidate === true;
  const alreadyDispatched = options.alreadyDispatched === true;
  if (!skipCandidate && typeof candidate === "function") {
    dispatchers.push(candidate);
  }
  if (typeof globalDispatchBattleEvent === "function" && globalDispatchBattleEvent !== candidate) {
    dispatchers.push(globalDispatchBattleEvent);
  }
  if (alreadyDispatched) {
    return true;
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
 * @summary Uses a caller-supplied dispatcher to fire "ready" while recording
 * telemetry and debug bag details.
 *
 * @pseudocode
 * 1. Exit early when the dispatcher is not callable.
 * 2. Capture metadata about the dispatcher and persist it to telemetry and the
 *    debug bag.
 * 3. Invoke the dispatcher with "ready", interpreting any result other than
 *    `false` as success.
 * 4. On errors, emit telemetry, update the debug bag, and return `false`.
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
 * @summary Reads the machine from the provided reader and dispatches "ready"
 * while preferring the shared battle dispatcher so dedupe tracking engages
 * before falling back to the raw machine.
 *
 * @pseudocode
 * 1. Attempt to read the machine defensively and record whether it exists and
 *    has a dispatch method.
 * 2. If dispatch is unavailable, return an object indicating failure.
 * 3. When the shared dispatcher exists, invoke `dispatchBattleEvent("ready")`
 *    so the dedupe path tracks the attempt before the bus strategy runs.
 * 4. If the shared dispatcher is unavailable or fails, fall back to calling
 *    the machine `dispatch("ready")` directly.
 * 5. Emit telemetry for success or failure and include whether dedupe tracking
 *    handled the dispatch in the returned payload.
 *
 * @param {object} params
 * @param {() => any} params.machineReader
 * @param {(key: string, value: any) => void} [params.emitTelemetry]
 * @returns {Promise<{ dispatched: boolean, dedupeTracked: boolean }>}
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
  if (!info.hasDispatch) {
    return { dispatched: false, dedupeTracked: false };
  }

  const recordSuccess = (dedupeTracked) => {
    emitTelemetry?.("handleNextRound_dispatchReadyDirectly_result", true);
    return { dispatched: true, dedupeTracked };
  };
  const dispatchViaMachine = async () => {
    const result = machine.dispatch("ready");
    await Promise.resolve(result);
  };
  let fallbackError = null;
  let machineError = null;
  let dedupeTracked = false;
  if (typeof globalDispatchBattleEvent === "function") {
    try {
      const result = await globalDispatchBattleEvent("ready");
      if (result !== false) {
        dedupeTracked = true;
      }
    } catch (error) {
      fallbackError = error;
    }
  }
  try {
    await dispatchViaMachine();
    return recordSuccess(dedupeTracked);
  } catch (error) {
    machineError = error;
    if (dedupeTracked) {
      emitTelemetry?.("handleNextRound_dispatchReadyDirectly_machineErrorAfterShared", {
        message: error?.message ?? String(error)
      });
    }
  }
  const parts = [];
  if (machineError) {
    parts.push(machineError.message ? machineError.message : String(machineError));
  }
  if (fallbackError) {
    parts.push(
      fallbackError && fallbackError.message
        ? `fallback:${fallbackError.message}`
        : `fallback:${String(fallbackError)}`
    );
  }
  const payload = parts.length > 0 ? parts.join(" | ") : "unknown";
  emitTelemetry?.("handleNextRound_dispatchReadyDirectly_error", payload);
  return { dispatched: false, dedupeTracked: false };
}

/**
 * @typedef {() => (
 *   | boolean
 *   | { dispatched: boolean, propagate?: boolean }
 *   | Promise<boolean | { dispatched: boolean, propagate?: boolean }>
 * )} ReadyDispatchStrategy
 */

/**
 * Sequentially execute dispatch strategies until one succeeds.
 *
 * @summary Coordinates multiple dispatch strategies, allowing successful steps
 * to request propagation before logging the aggregate result.
 *
 * @pseudocode
 * 1. If a previous step already dispatched "ready", emit success telemetry and
 *    return `true`.
 * 2. Iterate through each strategy function, awaiting its result.
 * 3. Emit success telemetry and return `true` the moment a strategy resolves
 *    truthy.
 * 4. After all strategies fail, emit failure telemetry and return `false`.
 *
 * @param {object} params
 * @param {boolean} [params.alreadyDispatchedReady]
 * @param {Array<ReadyDispatchStrategy>} [params.strategies]
 * @param {(key: string, value: any) => void} [params.emitTelemetry]
 * @returns {Promise<boolean>}
 */
export async function runReadyDispatchStrategies(params = {}) {
  const { alreadyDispatchedReady = false, strategies = [], emitTelemetry } = params;
  if (alreadyDispatchedReady) {
    emitTelemetry?.("handleNextRoundDispatchResult", true);
    return true;
  }
  let dispatched = false;
  const interpretResult = (value) => {
    if (value && typeof value === "object" && value !== null && !Array.isArray(value)) {
      const hasDispatchedProp = "dispatched" in value;
      const hasPropagateProp = "propagate" in value;
      if (hasDispatchedProp || hasPropagateProp) {
        return {
          dispatched: value.dispatched === true,
          propagate: value.propagate === true
        };
      }
    }
    return { dispatched: value === true, propagate: false };
  };
  for (const strategy of strategies) {
    if (typeof strategy !== "function") continue;
    try {
      const rawResult = await Promise.resolve(strategy());
      const { dispatched: stepDispatched, propagate } = interpretResult(rawResult);
      if (stepDispatched) {
        dispatched = true;
        emitTelemetry?.("handleNextRoundDispatchStepResult", {
          step:
            typeof strategy?.name === "string" && strategy.name.length > 0
              ? strategy.name
              : "anonymous",
          dispatched: true,
          propagate
        });
        if (!propagate) {
          emitTelemetry?.("handleNextRoundDispatchResult", true);
          return true;
        }
      }
    } catch {}
  }
  emitTelemetry?.("handleNextRoundDispatchResult", dispatched);
  return dispatched;
}

/**
 * Update DOM/UI affordances after the cooldown expires.
 *
 * @summary Refreshes the next-round button and optional debug panel when the
 * cooldown completes.
 *
 * @pseudocode
 * 1. Determine whether orchestration handles readiness; if not, find the live
 *    button element.
 * 2. Call `markReady` with the resolved button reference, ignoring failures.
 * 3. When provided, await `updateDebugPanel` to refresh debugging UI.
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
    if (documentRef) {
      try {
        const liveButton = documentRef.getElementById?.("next-button") || null;
        if (liveButton) {
          target = liveButton;
        }
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
