const HOOK_TARGET_KEY = "__battleTestHookTarget";

/**
 * Supported battle test hook event names.
 */
export const BATTLE_TEST_HOOK_EVENTS = {
  STAT_BUTTON_STATE: "classicBattle:statButtonsState"
};

function getGlobalScope() {
  if (typeof window !== "undefined") return window;
  if (typeof globalThis !== "undefined") return globalThis;
  return null;
}

function ensureHookTarget() {
  const scope = getGlobalScope();
  if (!scope) return null;
  if (!scope[HOOK_TARGET_KEY]) {
    const EventTargetCtor = scope.EventTarget || (typeof EventTarget === "function" ? EventTarget : null);
    if (typeof EventTargetCtor !== "function") {
      return null;
    }
    scope[HOOK_TARGET_KEY] = new EventTargetCtor();
  }
  return scope[HOOK_TARGET_KEY];
}

function createHookEvent(type, detail) {
  const CustomEventCtor =
    (typeof window !== "undefined" && window.CustomEvent) ||
    (typeof globalThis !== "undefined" && globalThis.CustomEvent) ||
    (typeof CustomEvent === "function" ? CustomEvent : null);
  if (typeof CustomEventCtor === "function") {
    return new CustomEventCtor(type, { detail });
  }
  const EventCtor =
    (typeof window !== "undefined" && window.Event) ||
    (typeof globalThis !== "undefined" && globalThis.Event) ||
    (typeof Event === "function" ? Event : null);
  if (typeof EventCtor === "function") {
    const event = new EventCtor(type);
    try {
      Object.defineProperty(event, "detail", { configurable: true, enumerable: true, value: detail });
    } catch {
      event.detail = detail;
    }
    return event;
  }
  return null;
}

/**
 * Emit a battle test hook event with the provided detail payload.
 *
 * @pseudocode
 * 1. Resolve the shared event target via `ensureHookTarget()`.
 * 2. Create a `CustomEvent` (or fallback Event) with the supplied detail.
 * 3. Dispatch the event and return true on success, false on any failure.
 *
 * @param {string} eventName - Event name to dispatch.
 * @param {any} detail - Arbitrary payload made available to listeners.
 * @returns {boolean} True when the event dispatch succeeded.
 */
export function emitBattleTestHookEvent(eventName, detail) {
  const target = ensureHookTarget();
  const event = target ? createHookEvent(eventName, detail) : null;
  if (!target || !event) return false;
  try {
    target.dispatchEvent(event);
    return true;
  } catch {
    return false;
  }
}

/**
 * Subscribe to a battle test hook event.
 *
 * @pseudocode
 * 1. Validate the handler; return a noop disposer if invalid.
 * 2. Resolve the shared hook `EventTarget` and bail out if unavailable.
 * 3. Add the listener and return a cleanup function that removes it safely.
 *
 * @param {string} eventName - Event type to listen for.
 * @param {(event: CustomEvent) => void} handler - Listener callback.
 * @returns {() => void} Cleanup function to remove the listener.
 */
export function addBattleTestHookListener(eventName, handler) {
  if (typeof handler !== "function") {
    return () => {};
  }
  const target = ensureHookTarget();
  if (!target || typeof target.addEventListener !== "function") {
    return () => {};
  }
  target.addEventListener(eventName, handler);
  return () => {
    try {
      target.removeEventListener(eventName, handler);
    } catch {}
  };
}

function createStatButtonHookInterface() {
  return {
    onStateChange(handler) {
      if (typeof handler !== "function") {
        return () => {};
      }
      return addBattleTestHookListener(
        BATTLE_TEST_HOOK_EVENTS.STAT_BUTTON_STATE,
        (event) => {
          const detail = event?.detail ?? null;
          try {
            handler(detail, event);
          } catch {}
        }
      );
    }
  };
}

function attachStatHookToGlobalTestApi() {
  const scope = getGlobalScope();
  try {
    const root = scope.__TEST_API || (scope.__TEST_API = {});
    const hooks = root.hooks || (root.hooks = {});
    if (!hooks.statButtons) {
      hooks.statButtons = createStatButtonHookInterface();
    }
  } catch {}
}

ensureHookTarget();
attachStatHookToGlobalTestApi();

/**
 * @summary Internal event emitter shared between battle modules and the battle test API.
 */
