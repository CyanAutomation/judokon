import { recordDebugState } from "./debugState.js";
import { isConsoleMocked, shouldShowTestLogs } from "./testLogGate.js";
import { measureDebugFlagToggle } from "./debugFlagPerformance.js";

const RATE_LIMIT_INTERVAL_MS = 120;

let appliedState = false;
let pendingState = null;
let pendingTaskCancel = null;
let pendingRunTask = null;
let pendingPromise = Promise.resolve();
let lastToggleAt = 0;

function scheduleIdle(runTask) {
  if (typeof requestIdleCallback === "function") {
    const idleId = requestIdleCallback(runTask);
    pendingTaskCancel = () => cancelIdleCallback(idleId);
    return;
  }
  if (typeof requestAnimationFrame === "function") {
    const frameId = requestAnimationFrame(runTask);
    pendingTaskCancel = () => cancelAnimationFrame(frameId);
    return;
  }
  const timeoutId = setTimeout(runTask, 16);
  pendingTaskCancel = () => clearTimeout(timeoutId);
}

function runToggleTask() {
  const state = pendingState ?? appliedState;
  pendingState = null;
  pendingTaskCancel = null;
  pendingRunTask = null;
  measureDebugFlagToggle(
    "tooltipOverlayDebug",
    () => {
      document.body.classList.toggle("tooltip-overlay-debug", state);
      document.body.setAttribute(
        "data-feature-tooltip-overlay-debug",
        state ? "enabled" : "disabled"
      );
    },
    { enabled: state ? 1 : 0 }
  );
  appliedState = state;
  lastToggleAt = Date.now();
  pendingPromise = Promise.resolve();
}

function scheduleToggleTask() {
  if (pendingRunTask) {
    return;
  }
  const now = Date.now();
  const delay = Math.max(0, lastToggleAt + RATE_LIMIT_INTERVAL_MS - now);
  pendingPromise = new Promise((resolve) => {
    const execute = () => {
      pendingRunTask = null;
      runToggleTask();
      resolve();
    };
    pendingRunTask = execute;
    if (delay > 0) {
      const delayId = setTimeout(() => {
        pendingTaskCancel = null;
        scheduleIdle(execute);
      }, delay);
      pendingTaskCancel = () => clearTimeout(delayId);
      return;
    }
    scheduleIdle(execute);
  });
}

function ensureFlushableState() {
  if (!pendingRunTask) {
    pendingPromise = Promise.resolve();
  }
}

function applyFallbackState(state) {
  appliedState = state;
  pendingState = null;
  ensureFlushableState();
}

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
export function toggleTooltipOverlayDebug(enabled) {
  const nextState = Boolean(enabled);
  recordDebugState("tooltipOverlayDebug", nextState);
  pendingState = nextState;
  if (typeof document === "undefined" || !document.body) {
    if (typeof console !== "undefined" && (shouldShowTestLogs() || isConsoleMocked(console.info))) {
      console.info(
        "[tooltipOverlayDebug] Document unavailable; recorded desired state:",
        nextState
      );
    }
    applyFallbackState(nextState);
    return;
  }
  const bodyHasOverlay = document.body.classList.contains("tooltip-overlay-debug");
  const attrState = document.body.getAttribute("data-feature-tooltip-overlay-debug");
  const desiredAttr = nextState ? "enabled" : "disabled";
  if (
    !pendingRunTask &&
    nextState === appliedState &&
    bodyHasOverlay === nextState &&
    attrState === desiredAttr
  ) {
    pendingState = null;
    ensureFlushableState();
    return;
  }
  scheduleToggleTask();
}

/**
 * Await or immediately execute any pending overlay debug work.
 *
 * @returns {Promise<void>} Resolves once pending work completes.
 */
export function flushTooltipOverlayDebugWork() {
  if (pendingRunTask) {
    const runNow = pendingRunTask;
    pendingRunTask = null;
    if (typeof pendingTaskCancel === "function") {
      pendingTaskCancel();
    }
    pendingTaskCancel = null;
    runNow();
  }
  return pendingPromise;
}
