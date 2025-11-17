const MAX_HISTORY = 30;
const listeners = new Set();
const history = [];
let nextEventId = 1;

function toEventObject(type, detail) {
  return {
    id: nextEventId++,
    type: String(type),
    detail: detail ?? null,
    timestamp: Date.now()
  };
}

/**
 * Emit a stat-button test event and notify subscribers.
 *
 * @pseudocode
 * 1. Ignore falsy event types to avoid polluting the queue.
 * 2. Push the serialized event into the bounded history array.
 * 3. Notify each active subscriber inside a try/catch so a bad listener does not break tests.
 *
 * @param {string} type - Event type (e.g. "handler", "disabled").
 * @param {Record<string, any>|null} [detail] - Optional structured payload to include with the event.
 * @returns {void}
 */
export function emitStatButtonTestEvent(type, detail) {
  if (!type) {
    return;
  }
  const event = toEventObject(type, detail);
  history.push(event);
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
  for (const listener of Array.from(listeners)) {
    try {
      listener(event);
    } catch {}
  }
}

/**
 * Subscribe to stat-button test events.
 *
 * @pseudocode
 * 1. Return a no-op cleanup function when the listener is not callable.
 * 2. Add the listener to the shared Set so multiple consumers can observe events.
 * 3. Provide a cleanup closure that removes the listener when invoked.
 *
 * @param {(event: {id:number,type:string,detail:any,timestamp:number}) => void} listener
 * @returns {() => void} Cleanup function to unregister the listener.
 */
export function subscribeToStatButtonTestEvents(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Get a shallow copy of the recent stat-button event history.
 *
 * @pseudocode
 * 1. Return a new array with the recorded events so callers cannot mutate the internal queue.
 *
 * @returns {Array<{id:number,type:string,detail:any,timestamp:number}>}
 */
export function getStatButtonEventHistory() {
  return history.slice();
}

/**
 * Get the most recent stat-button event, if any.
 *
 * @pseudocode
 * 1. Return the last item in the history array or `null` when no events exist.
 *
 * @returns {{id:number,type:string,detail:any,timestamp:number}|null}
 */
export function getLastStatButtonTestEvent() {
  return history.length > 0 ? history[history.length - 1] : null;
}

function serializeEvent(event, timedOut = false) {
  if (!event) {
    return {
      id: null,
      type: null,
      detail: null,
      timestamp: null,
      timedOut: Boolean(timedOut)
    };
  }
  return {
    id: typeof event.id === "number" ? event.id : null,
    type: event.type ?? null,
    detail: event.detail ?? null,
    timestamp: typeof event.timestamp === "number" ? event.timestamp : null,
    timedOut: Boolean(timedOut)
  };
}

function matchesEvent(event, typeSet, minId) {
  if (!event) return false;
  if (typeof event.id === "number" && event.id <= minId) {
    return false;
  }
  if (!typeSet) {
    return true;
  }
  return typeSet.has(event.type);
}

function findMatchingEvent(typeSet, minId) {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (matchesEvent(history[i], typeSet, minId)) {
      return history[i];
    }
  }
  return null;
}

function waitForStatButtonEventInternal(options = {}) {
  const { timeout = 1000, types, afterId } = options || {};
  const typeSet =
    Array.isArray(types) && types.length > 0 ? new Set(types.map((value) => String(value))) : null;
  const minId = Number.isFinite(afterId) ? Number(afterId) : 0;
  const timeoutMs = Number.isFinite(timeout) && timeout > 0 ? Number(timeout) : 1000;

  return new Promise((resolve, reject) => {
    let finished = false;
    let timeoutId;
    let unsubscribe;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      if (typeof unsubscribe === "function") {
        try {
          unsubscribe();
        } catch {}
        unsubscribe = undefined;
      }
    };

    const finish = (event, timedOut) => {
      if (finished) return;
      finished = true;
      cleanup();
      if (timedOut) {
        const error = new Error(`Timeout waiting for stat button event after ${timeoutMs}ms`);
        error.name = "StatButtonTestTimeoutError";
        error.event = serializeEvent(null, true);
        reject(error);
      } else {
        resolve(serializeEvent(event, false));
      }
    };

    const immediate = findMatchingEvent(typeSet, minId);
    if (immediate) {
      finish(immediate, false);
      return;
    }

    unsubscribe = subscribeToStatButtonTestEvents((event) => {
      if (matchesEvent(event, typeSet, minId)) {
        finish(event, false);
      }
    });

    timeoutId = setTimeout(() => finish(null, true), timeoutMs);
  });
}

/**
 * Create a structured test API for stat-button telemetry consumers.
 *
 * @pseudocode
 * 1. Provide helpers to read the last event or a trimmed history snapshot.
 * 2. Return promise-based waiters that resolve when matching events appear.
 * 3. Reuse the shared event queue so multiple callers can coordinate waits.
 *
 * @returns {{getLastEvent: () => object|null, getHistory: (options?: {limit?: number}) => object[], waitForEvent: (options?: object) => Promise<object>, waitForHandler: (options?: object) => Promise<object>, waitForDisable: (options?: object) => Promise<object>}}
 */
export function createStatButtonTestApi() {
  return {
    getLastEvent() {
      const last = getLastStatButtonTestEvent();
      return last ? serializeEvent(last, false) : null;
    },
    /**
     * Read a serialized slice of the event history for debugging output.
     *
     * @pseudocode
     * 1. Copy the event history array to avoid mutating shared state.
     * 2. When `options.limit` is provided, trim to the most recent N events.
     * 3. Serialize each event so tests receive plain objects.
     *
     * @param {{limit?: number}} [options]
     * @returns {Array<{id:number|null,type:string|null,detail:any,timestamp:number|null,timedOut:boolean}>}
     */
    getHistory(options) {
      const events = getStatButtonEventHistory();
      if (!options || !Number.isFinite(options.limit) || options.limit <= 0) {
        return events.map((event) => serializeEvent(event, false));
      }
      const limit = Number(options.limit);
      return events
        .slice(Math.max(0, events.length - limit))
        .map((event) => serializeEvent(event, false));
    },
    waitForEvent(options) {
      return waitForStatButtonEventInternal(options);
    },
    waitForHandler(options) {
      return waitForStatButtonEventInternal({ ...(options ?? {}), types: ["handler"] });
    },
    waitForDisable(options) {
      return waitForStatButtonEventInternal({ ...(options ?? {}), types: ["disabled"] });
    }
  };
}

function ensureGlobalStatButtonApi() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const root = window.__TEST_API || (window.__TEST_API = {});
    if (!root.statButtons) {
      root.statButtons = createStatButtonTestApi();
    }
  } catch {}
}

ensureGlobalStatButtonApi();
