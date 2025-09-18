import { recordDebugState } from "./debugState.js";

/**
 * Toggle viewport simulation by adding or removing the `.simulate-viewport` class on the body.
 *
 * @pseudocode
 * 1. Persist the requested state to the shared debug registry.
 * 2. When `document` or `document.body` is unavailable, log the stored state and exit.
 * 3. Otherwise toggle the `simulate-viewport` class on `document.body`.
 *
 * @param {boolean} enabled - Whether to apply the simulated viewport width.
 * @returns {void}
 */

export function toggleViewportSimulation(enabled) {
  const nextState = Boolean(enabled);
  recordDebugState("viewportSimulation", nextState);
  if (typeof document === "undefined" || !document.body) {
    console.info("[viewportSimulation] Document unavailable; recorded desired state:", nextState);
    return;
  }
  document.body.classList.toggle("simulate-viewport", nextState);
}
