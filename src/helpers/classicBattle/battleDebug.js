// Debug utilities for Classic Battle state management.
// Provides snapshot access and transition logging.

let currentState = null;
let prevState = null;
let lastEvent = null;
let stateLog = [];

/**
 * Record a transition for debugging.
 *
 * @param {string|null} from Previous state name, or null when unknown.
 * @param {string} to New state name.
 * @param {string|null} event Optional event that triggered the transition.
 * @returns {void}
 *
 * @pseudocode
 * 1. Update module-scoped `currentState` with the new `to` value.
 * 2. If `from` is provided, store it in `prevState` for diagnostics.
 * 3. If `event` is provided, record it as `lastEvent` for context.
 * 4. Push a compact record ({from,to,event,ts}) onto `stateLog`.
 * 5. Trim `stateLog` to the most recent 20 entries to bound memory.
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
 *
 * @pseudocode
 * 1. If `currentState` is set, return a snapshot object containing
 *    `state`, `prev`, `event`, and a shallow copy of `stateLog`.
 * 2. If `currentState` is not set, attempt to read mirrored state from
 *    `document.body.dataset` (works in page contexts where the logger
 *    wasn't wired into this module instance).
 * 3. If DOM-mirrored state is found, return that with the `stateLog` copy.
 * 4. Otherwise return an object with `null` values and the copied log.
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
 *
 * @pseudocode
 * 1. Replace module-scoped `currentState`, `prevState`, and `lastEvent`
 *    with values from `next` (falling back to `null` when missing).
 * 2. If `next.log` is an array, shallow-copy it into `stateLog`, else
 *    set `stateLog` to an empty array.
 */
/**
 * Replace the in-memory state snapshot (test helper).
 *
 * @param {{state?:string|null,prev?:string|null,event?:string|null,log?:Array}} next
 * @returns {void}
 *
 * @pseudocode
 * 1. Replace module-scoped `currentState`, `prevState`, and `lastEvent`
 *    with values from `next` (falling back to `null` when missing).
 * 2. If `next.log` is an array, shallow-copy it into `stateLog`, else
 *    set `stateLog` to an empty array.
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
