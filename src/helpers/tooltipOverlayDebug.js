import { recordDebugState } from "./debugState.js";
import { isConsoleMocked, shouldShowTestLogs } from "./testLogGate.js";
import { measureDebugFlagToggle } from "./debugFlagPerformance.js";

const RATE_LIMIT_INTERVAL_MS = 120;

let appliedState = false;
let pendingState = null;
let pendingTaskCancel = null;
let pendingRunTask = null;
let pendingPromise = Promise.resolve();
let pendingResolve = null;
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

function resetPendingPromise() {
  pendingPromise = Promise.resolve();
  pendingResolve = null;
  pendingState = null;
}

function cancelPendingWork() {
  if (typeof pendingTaskCancel === "function") {
    pendingTaskCancel();
  }
  pendingTaskCancel = null;
  pendingRunTask = null;
  if (typeof pendingResolve === "function") {
    pendingResolve();
  }
  resetPendingPromise();
}

function applyOverlayState(state) {
  measureDebugFlagToggle(
    "debugProfiles.ui",
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
  pendingState = null;
  lastToggleAt = Date.now();
}

function runToggleTask() {
  const state = pendingState ?? appliedState;
  pendingTaskCancel = null;
  pendingRunTask = null;
  const resolve = pendingResolve;
  pendingResolve = null;
  applyOverlayState(state);
  if (typeof resolve === "function") {
    resolve();
  }
  resetPendingPromise();
}

function scheduleToggleTask() {
  if (pendingRunTask) {
    return pendingPromise;
  }
  const now = Date.now();
  const delay = Math.max(0, lastToggleAt + RATE_LIMIT_INTERVAL_MS - now);
  pendingPromise = new Promise((resolve) => {
    pendingResolve = resolve;
    const execute = () => {
      runToggleTask();
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
  return pendingPromise;
}

function applyFallbackState(state) {
  cancelPendingWork();
  appliedState = state;
  lastToggleAt = Date.now();
}

/**
 * Toggle the tooltip debug overlay class on the document body.
 *
 * @pseudocode
 * 1. Persist the desired state to the shared debug registry.
 * 2. If `document` or `document.body` is unavailable, log the recorded state and exit.
 * 3. When disabling, cancel any pending work and synchronously remove the overlay markers.
 * 4. When enabling (or re-applying), enqueue the DOM mutation on an idle frame with rate limiting.
 * 5. Resolve pending work promises so deterministic tests can flush the scheduled toggle.
 *
 * @param {boolean} enabled - Whether the overlay should be enabled.
 * @returns {void}
 */
export function toggleTooltipOverlayDebug(enabled) {
  const nextState = Boolean(enabled);
  recordDebugState("debugProfiles.ui", nextState);
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
  if (!nextState) {
    cancelPendingWork();
    applyOverlayState(false);
    return;
  }
  if (
    !pendingRunTask &&
    nextState === appliedState &&
    bodyHasOverlay === nextState &&
    attrState === desiredAttr
  ) {
    resetPendingPromise();
    return;
  }
  scheduleToggleTask();
}

/**
 * Await or immediately execute any pending overlay debug work.
 *
 * @pseudocode
 * 1. If a toggle task is queued, cancel its timer and execute it immediately.
 * 2. Return the promise representing pending work so callers can await completion.
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
