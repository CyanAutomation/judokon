import { recordDebugState } from "./debugState.js";

/**
 * Toggle the tooltip debug overlay class on the document body.
 *
 * @pseudocode
 * 1. Persist the desired state to the shared debug registry.
 * 2. If `document` or `document.body` is unavailable, log the recorded state and exit.
 * 3. Otherwise toggle the "tooltip-overlay-debug" class on `document.body`.
 *
 * @param {boolean} enabled - Whether the overlay should be enabled.
 * @returns {void}
 */

const shouldShowDebugLogs = () => typeof process !== "undefined" && process.env?.SHOW_TEST_LOGS;
const isConsoleMocked = (method) => {
  const viInstance = globalThis?.vi;
  return (
    typeof viInstance?.isMockFunction === "function" &&
    typeof method === "function" &&
    viInstance.isMockFunction(method)
  );
};

export function toggleTooltipOverlayDebug(enabled) {
  const nextState = Boolean(enabled);
  recordDebugState("tooltipOverlayDebug", nextState);
  if (typeof document === "undefined" || !document.body) {
    if (
      typeof console !== "undefined" &&
      (shouldShowDebugLogs() || isConsoleMocked(console.info))
    ) {
      console.info(
        "[tooltipOverlayDebug] Document unavailable; recorded desired state:",
        nextState
      );
    }
    return;
  }
  document.body.classList.toggle("tooltip-overlay-debug", nextState);
}
