import { onBattleEvent, offBattleEvent } from "./battleEvents.js";

/**
 * Bind legacy `match.concluded` payloads as non-authoritative score/value updates.
 *
 * @param {(detail: object) => void} onPayload - Called with the raw event detail.
 * @returns {() => void} Disposer for the compatibility listener.
 * @pseudocode
 * 1. Subscribe to `match.concluded`.
 * 2. Forward only payload values to consumers.
 * 3. Keep this adapter non-authoritative; callers must drive UI state from control FSM events.
 */
export function bindMatchConcludedCompatibilityAdapter(onPayload) {
  if (typeof onPayload !== "function") {
    return () => {};
  }

  const handleMatchConcluded = (event) => {
    onPayload(event?.detail || {});
  };

  onBattleEvent("match.concluded", handleMatchConcluded);

  return () => {
    offBattleEvent("match.concluded", handleMatchConcluded);
  };
}
