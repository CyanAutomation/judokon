/**
 * Observe battle state changes and mirror them to DOM and globals.
 *
 * @pseudocode
 * 1. Return early when not running in a browser.
 * 2. Define `handleStateChange(from, to, event)`:
 *    a. Mirror `to`, `from`, and `event` to window globals.
 *    b. Update `document.body.dataset` entries.
 *    c. Dispatch a `battle:state` DOM event with the new state.
 *    d. Append the transition to an in-memory log (`window.__classicBattleStateLog`).
 *    e. Ensure hidden `#machine-state` element reflects the new values.
 *    f. Update `#battle-state-badge` text when present.
 *    g. Resolve any waiters stored on `window.__stateWaiters[to]`.
 * 3. Export `handleStateChange`.
 * 4. Export `attachStateDebugObserver()` that listens for `stateChange` battle events
 *    and invokes `handleStateChange`.
 *
 * @returns {() => void} Cleanup function to detach the observer.
 */
import { onBattleEvent, offBattleEvent } from "./battleEvents.js";

export function handleStateChange(from, to, event) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  try {
    window.__classicBattleState = to;
    if (from) window.__classicBattlePrevState = from;
    if (event) window.__classicBattleLastEvent = event;
    document.body.dataset.battleState = to;
    document.body.dataset.prevBattleState = from || "";
    try {
      // Keep tests observable; muted by test helpers in CI
      console.warn(`[test] dataset.battleState set -> ${document.body.dataset.battleState}`);
    } catch {}
    document.dispatchEvent(new CustomEvent("battle:state", { detail: to }));
    const logEntry = { from: from || null, to, event: event || null, ts: Date.now() };
    const log = Array.isArray(window.__classicBattleStateLog) ? window.__classicBattleStateLog : [];
    log.push(logEntry);
    while (log.length > 20) log.shift();
    window.__classicBattleStateLog = log;
    let el = document.getElementById("machine-state");
    if (!el) {
      el = document.createElement("div");
      el.id = "machine-state";
      el.style.display = "none";
      document.body.appendChild(el);
    }
    el.textContent = to;
    if (from) el.dataset.prev = from;
    if (event) el.dataset.event = event;
    el.dataset.ts = String(logEntry.ts);
    const badge = document.getElementById("battle-state-badge");
    if (badge) badge.textContent = `State: ${to}`;
    try {
      const waiters = (window.__stateWaiters && window.__stateWaiters[to]) || [];
      if (Array.isArray(waiters) && waiters.length) {
        window.__stateWaiters[to] = [];
        for (const w of waiters) {
          try {
            if (w && typeof w.resolve === "function") {
              if (w.timer) clearTimeout(w.timer);
              w.resolve(true);
            }
          } catch {}
        }
      }
    } catch {}
  } catch {}
}

export function attachStateDebugObserver() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }
  const handler = (e) => {
    const { from, to, event } = e.detail || {};
    handleStateChange(from, to, event);
  };
  onBattleEvent("stateChange", handler);
  return () => offBattleEvent("stateChange", handler);
}
