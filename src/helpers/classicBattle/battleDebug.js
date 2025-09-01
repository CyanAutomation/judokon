// Debug utilities for Classic Battle state management.
// Provides snapshot access and transition logging.

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
  if (currentState) {
    return {
      state: currentState,
      prev: prevState,
      event: lastEvent,
      log: stateLog.slice()
    };
  }
  // Fallback to DOM-mirrored state when the debug logger wasn't wired in
  // this module instance (possible in certain test setups).
  try {
    const ds = document?.body?.dataset;
    if (ds && ds.battleState) {
      return {
        state: ds.battleState || null,
        prev: ds.prevBattleState || null,
        event: lastEvent,
        log: stateLog.slice()
      };
    }
  } catch {}
  return { state: null, prev: null, event: null, log: stateLog.slice() };
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
  window.getStateSnapshot = getStateSnapshot;
}
