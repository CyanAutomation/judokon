import { isConsoleMocked, shouldShowTestLogs } from "../testLogGate.js";
/**
 * Lightweight event bus for Classic Battle interactions.
 *
 * @pseudocode
 * 1. Build bus instances with their own EventTarget and dedupe memory.
 * 2. Expose a module-level active bus for backwards-compatible helpers.
 * 3. Allow callers to swap the active bus for per-match isolation.
 */
import { logEventEmit, createComponentLogger } from "./debugLogger.js";
import { setMaxListenersIfNode } from "../nodeEventsShim.js";
import { emitBattleEventWithAliases as emitBattleEventWithAliasesCore } from "./eventAliases.js";

const eventLogger = createComponentLogger("BattleEvents");
const DISPATCH_PATCHED_KEY = "__classicBattleDispatchPatched";
const DISPATCH_ORIGINAL_KEY = "__classicBattleDispatchOriginal";
const DISPATCH_WRAPPED_KEY = "__classicBattleDispatchWrapped";
const VALUE_ONLY_EVENT_TYPES = new Set([
  "round.timer.tick",
  "round.evaluated",
  "display.score.update",
  "match.score.update",
  "match.score.updated"
]);

/**
 * Check if running in Vitest environment.
 *
 * @pseudocode
 * 1. Safely check for process.env.VITEST variable.
 * 2. Return false if not in Node.js or variable unavailable.
 *
 * @returns {boolean} True if running under Vitest.
 */
function isVitest() {
  try {
    return typeof process !== "undefined" && !!process.env?.VITEST;
  } catch {
    return false;
  }
}

/**
 * Instrument event dispatcher for test debugging (Vitest only).
 *
 * @pseudocode
 * 1. Only patch globalThis.dispatchEvent if running under Vitest.
 * 2. Log events when test logs are enabled or console is mocked.
 * 3. Preserve original dispatcher behavior.
 *
 * @returns {void}
 */
function setupTestDebugInstrumentation() {
  if (!isVitest()) return;

  if (typeof globalThis.dispatchEvent !== "function") {
    return;
  }

  if (
    globalThis[DISPATCH_PATCHED_KEY] &&
    globalThis.dispatchEvent === globalThis[DISPATCH_WRAPPED_KEY]
  ) {
    return;
  }

  const originalDispatchEvent =
    typeof globalThis[DISPATCH_ORIGINAL_KEY] === "function"
      ? globalThis[DISPATCH_ORIGINAL_KEY]
      : globalThis.dispatchEvent;

  if (globalThis.dispatchEvent === globalThis[DISPATCH_WRAPPED_KEY]) {
    globalThis[DISPATCH_PATCHED_KEY] = true;
    return;
  }

  const wrappedDispatchEvent = function (event) {
    if (
      typeof console !== "undefined" &&
      event &&
      event.type &&
      (shouldShowTestLogs() || isConsoleMocked(console.log))
    ) {
      console.log("[TEST DEBUG] dispatchEvent:", event.type, event.detail);
    }
    return originalDispatchEvent.apply(this, arguments);
  };

  globalThis[DISPATCH_ORIGINAL_KEY] = originalDispatchEvent;
  globalThis[DISPATCH_WRAPPED_KEY] = wrappedDispatchEvent;
  globalThis.dispatchEvent = wrappedDispatchEvent;
  globalThis[DISPATCH_PATCHED_KEY] = true;
}

setupTestDebugInstrumentation();

function tuneMaxListenersIfNode(target) {
  if (!target || !isVitest()) return;

  try {
    queueMicrotask(() => {
      setMaxListenersIfNode(target);
    });
  } catch {}
}

function buildSemanticDetailKey(detail) {
  if (!detail) {
    return "__no_detail__";
  }
  const scorePlayer = detail?.scores?.player ?? detail?.player;
  const scoreOpponent = detail?.scores?.opponent ?? detail?.opponent;
  const components = [
    detail?.roundIndex,
    detail?.round,
    detail?.version,
    detail?.payloadVersion,
    detail?.payloadHash,
    detail?.hash,
    detail?.remainingMs,
    detail?.state,
    detail?.to,
    scorePlayer,
    scoreOpponent,
    detail?.winner
  ];
  return components
    .map((value) => (value === undefined ? "__undefined__" : String(value)))
    .join("|");
}

/**
 * Construct a Classic Battle event bus instance.
 *
 * @param {{target?: EventTarget}} [options] - Optional pre-created EventTarget.
 * @returns {{
 *   on: (type: string, handler: (e: CustomEvent) => void) => void,
 *   off: (type: string, handler: (e: CustomEvent) => void) => void,
 *   emit: (type: string, detail?: any) => void,
 *   emitWithAliases: (type: string, detail?: any, options?: object) => void,
 *   getTarget: () => EventTarget,
 *   resetDedupeState: () => void,
 *   dispose: () => void
 * }}
 * @summary Create an isolated battle event bus for a single match lifecycle.
 * @pseudocode
 * 1. Resolve or create a dedicated EventTarget.
 * 2. Keep per-instance dedupe memory for value-only events.
 * 3. Return bus methods for subscribe/unsubscribe/emit/dispose.
 */
export function createBattleEventBus(options = {}) {
  const target = options.target instanceof EventTarget ? options.target : new EventTarget();
  const lastSeenEventKeys = new Map();
  const listenerRegistry = new Map();

  tuneMaxListenersIfNode(target);

  function resetDedupeState() {
    lastSeenEventKeys.clear();
  }

  function trackListener(type, handler) {
    const listeners = listenerRegistry.get(type) ?? new Set();
    listeners.add(handler);
    listenerRegistry.set(type, listeners);
  }

  function untrackListener(type, handler) {
    const listeners = listenerRegistry.get(type);
    if (!listeners) return;
    listeners.delete(handler);
    if (listeners.size === 0) {
      listenerRegistry.delete(type);
    }
  }

  function clearTrackedListeners() {
    for (const [type, listeners] of listenerRegistry.entries()) {
      for (const handler of listeners) {
        target.removeEventListener(type, handler);
      }
    }
    listenerRegistry.clear();
  }

  function shouldSuppressDuplicateValueEvent(type, detail) {
    if (type === "control.state.changed") {
      return false;
    }
    if (!VALUE_ONLY_EVENT_TYPES.has(type)) {
      return false;
    }

    const dedupeKey = `${type}:${buildSemanticDetailKey(detail)}`;
    const lastSeenKey = lastSeenEventKeys.get(type);

    if (lastSeenKey === dedupeKey) {
      return true;
    }

    lastSeenEventKeys.set(type, dedupeKey);
    return false;
  }

  const bus = {
    on(type, handler) {
      target.addEventListener(type, handler);
      trackListener(type, handler);
    },
    off(type, handler) {
      target.removeEventListener(type, handler);
      untrackListener(type, handler);
    },
    emit(type, detail) {
      try {
        if (shouldSuppressDuplicateValueEvent(type, detail)) {
          eventLogger.debug(`Suppressed duplicate value event: ${type}`, detail);
          return;
        }

        logEventEmit(type, detail, { timestamp: Date.now() });
        target.dispatchEvent(new CustomEvent(type, { detail }));
      } catch (error) {
        eventLogger.error(`Failed to emit event "${type}":`, error);
      }
    },
    emitWithAliases(type, detail, options = {}) {
      try {
        eventLogger.event(`Emitting with aliases: ${type}`, detail, { options });
        emitBattleEventWithAliasesCore(type, detail, options, target);
      } catch (error) {
        eventLogger.error(`Failed to emit aliased event "${type}":`, error);
        bus.emit(type, detail);
      }
    },
    getTarget() {
      return target;
    },
    resetDedupeState,
    dispose() {
      if (typeof target?.removeAllListeners === "function") {
        target.removeAllListeners();
        listenerRegistry.clear();
      } else {
        clearTrackedListeners();
      }
      resetDedupeState();
    }
  };

  return bus;
}

let activeBattleEventBus = createBattleEventBus();

/**
 * Set the active global battle event bus used by module-level helpers.
 *
 * @param {ReturnType<typeof createBattleEventBus>} bus - Bus to activate.
 * @returns {ReturnType<typeof createBattleEventBus>} Activated bus.
 * @pseudocode
 * 1. Validate the provided bus exposes `on` and `emit` functions.
 * 2. Replace the module-level active bus reference when valid.
 * 3. Return the active bus reference.
 */
export function setActiveBattleEventBus(bus) {
  if (bus && typeof bus.on === "function" && typeof bus.emit === "function") {
    activeBattleEventBus = bus;
  }
  return activeBattleEventBus;
}

/**
 * Retrieve the active battle event bus used by compatibility helpers.
 *
 * @returns {ReturnType<typeof createBattleEventBus>}
 * @pseudocode
 * 1. Return the currently active module-level battle bus.
 */
export function getActiveBattleEventBus() {
  return activeBattleEventBus;
}

/**
 * Clear value-event dedupe memory for the active bus.
 *
 * @returns {void}
 * @pseudocode
 * 1. Call `resetDedupeState` on the active bus.
 */
export function resetBattleEventDedupeState() {
  activeBattleEventBus.resetDedupeState();
}

/**
 * Subscribe to an event on the active bus.
 *
 * @param {string} type - Event name.
 * @param {(e: CustomEvent) => void} handler - Event listener.
 * @returns {void}
 * @pseudocode
 * 1. Delegate listener registration to the active bus.
 */
export function onBattleEvent(type, handler) {
  activeBattleEventBus.on(type, handler);
}

/**
 * Unsubscribe from an event on the active bus.
 *
 * @param {string} type - Event name.
 * @param {(e: CustomEvent) => void} handler - Event listener.
 * @returns {void}
 * @pseudocode
 * 1. Delegate listener removal to the active bus.
 */
export function offBattleEvent(type, handler) {
  activeBattleEventBus.off(type, handler);
}

/**
 * Emit an event on the active bus.
 *
 * @param {string} type - Event name.
 * @param {any} [detail] - Event payload.
 * @returns {void}
 * @pseudocode
 * 1. Delegate event emission to the active bus.
 */
export function emitBattleEvent(type, detail) {
  activeBattleEventBus.emit(type, detail);
}

/**
 * Emit an event with compatibility aliases on the active bus.
 *
 * @param {string} type - Event name.
 * @param {any} [detail] - Event payload.
 * @param {object} [options={}] - Alias emission options.
 * @returns {void}
 * @pseudocode
 * 1. Delegate aliased emission to the active bus instance.
 */
export function emitBattleEventWithAliases(type, detail, options = {}) {
  activeBattleEventBus.emitWithAliases(type, detail, options);
}

/**
 * Test helper: replace active bus with a fresh instance.
 *
 * @returns {ReturnType<typeof createBattleEventBus>}
 * @pseudocode
 * 1. Create a fresh event bus instance.
 * 2. Set it as active bus.
 * 3. Return the new bus for explicit test wiring.
 */
export function __resetBattleEventTarget() {
  const bus = createBattleEventBus();
  setActiveBattleEventBus(bus);
  return bus;
}

/**
 * Return the EventTarget for the currently active bus.
 *
 * @returns {EventTarget}
 * @pseudocode
 * 1. Resolve the active bus.
 * 2. Return its EventTarget.
 */
export function getBattleEventTarget() {
  return activeBattleEventBus.getTarget();
}
