// Debug utilities for Classic Battle state management.
// Provides waiters, snapshot access, and transition logging.

const stateWaiters = new Map();
const stateWaiterEvents = [];

let currentState = null;
let prevState = null;
let lastEvent = null;
let stateLog = [];

/**
 * Record a transition for debugging.
 *
 * @param {string|null} from Previous state.
 * @param {string} to New state.
 * @param {string|null} event Triggering event.
 */
export function logStateTransition(from, to, event) {
  currentState = to;
  if (from) prevState = from;
  if (event) lastEvent = event;
  stateLog.push({ from, to, event, ts: Date.now() });
  while (stateLog.length > 20) stateLog.shift();
}

/**
 * Retrieve current state diagnostics.
 *
 * @returns {{state:string|null,prev:string|null,event:string|null,log:Array}}
 */
export function getStateSnapshot() {
  return {
    state: currentState,
    prev: prevState,
    event: lastEvent,
    log: stateLog.slice()
  };
}

/**
 * Resolve when the state machine enters the target state.
 *
 * @param {string} targetState Desired state name.
 * @param {number} [timeoutMs=10000] Timeout in ms.
 * @returns {Promise<boolean>} Resolves to true on success.
 */
export function waitForState(targetState, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    try {
      if (currentState === targetState) {
        resolve(true);
        return;
      }
      const entry = { resolve };
      entry.__id = Math.random().toString(36).slice(2, 9);
      stateWaiterEvents.push({
        action: "add",
        state: targetState,
        id: entry.__id,
        ts: Date.now()
      });
      if (timeoutMs !== Infinity) {
        entry.timer = setTimeout(() => {
          const list = stateWaiters.get(targetState) || [];
          const idx = list.indexOf(entry);
          if (idx !== -1) list.splice(idx, 1);
          if (list.length === 0) stateWaiters.delete(targetState);
          stateWaiterEvents.push({
            action: "timeout",
            state: targetState,
            id: entry.__id,
            ts: Date.now()
          });
          reject(new Error(`waitForState timeout for ${targetState}`));
        }, timeoutMs);
      }
      const arr = stateWaiters.get(targetState) || [];
      arr.push(entry);
      stateWaiters.set(targetState, arr);
    } catch {
      reject(new Error("waitForState setup error"));
    }
  });
}

/**
 * Fulfil queued waiters for a state.
 *
 * @param {string} to State that was reached.
 */
export function resolveStateWaiters(to) {
  const waiters = stateWaiters.get(to);
  if (waiters) {
    stateWaiters.delete(to);
    for (const w of waiters) {
      if (w.timer) clearTimeout(w.timer);
      try {
        w.resolve(true);
      } catch {}
    }
  }
}

/**
 * Dump waiter diagnostics.
 *
 * @returns {{waiters:Object,events:Array}} Summary of waiters.
 */
export function dumpStateWaiters() {
  const waiters = {};
  for (const [key, arr] of stateWaiters.entries()) {
    waiters[key] = arr.map((e) => ({ id: e.__id || null, hasTimer: !!e.timer }));
  }
  return { waiters, events: stateWaiterEvents.slice() };
}

/**
 * Test helper to override the current snapshot.
 *
 * @param {{state?:string|null,prev?:string|null,event?:string|null,log?:Array}} next
 */
export function __setStateSnapshot(next) {
  currentState = next.state || null;
  prevState = next.prev || null;
  lastEvent = next.event || null;
  stateLog = Array.isArray(next.log) ? next.log.slice() : [];
}

// Expose helpers for in-page consumers like Playwright fixtures.
if (typeof window !== "undefined") {
  window.waitForState = waitForState;
  window.getStateSnapshot = getStateSnapshot;
}
