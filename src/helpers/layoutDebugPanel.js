import { measureDebugFlagToggle } from "./debugFlagPerformance.js";

let enabledState = false;
const DEFAULT_SELECTORS = ["body *:not(script):not(style)"];

let pendingTaskCancel = null;
let pendingResolve = null;
let pendingPromise = Promise.resolve();

function toSelectorList(selectors) {
  if (Array.isArray(selectors)) {
    return selectors.slice();
  }
  return DEFAULT_SELECTORS.slice();
}

function clearOutlines() {
  document
    .querySelectorAll(".layout-debug-outline")
    .forEach((el) => el.classList.remove("layout-debug-outline"));
}

function applyOutlines(selectorList) {
  selectorList.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      if (el.offsetParent !== null) {
        el.classList.add("layout-debug-outline");
      }
    });
  });
}

function cancelPendingTask() {
  if (typeof pendingTaskCancel === "function") {
    pendingTaskCancel();
  }
  pendingTaskCancel = null;
  if (typeof pendingResolve === "function") {
    pendingResolve();
  }
  pendingResolve = null;
}

function scheduleOutlineRender(selectorList) {
  cancelPendingTask();
  pendingPromise = new Promise((resolve) => {
    pendingResolve = resolve;

    const run = () => {
      pendingTaskCancel = null;
      pendingResolve = null;
      measureDebugFlagToggle(
        "layoutDebugPanel",
        () => {
          clearOutlines();
          applyOutlines(selectorList);
        },
        { selectors: selectorList.length }
      );
      resolve();
    };

    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(run);
      pendingTaskCancel = () => cancelIdleCallback(id);
      return;
    }

    if (typeof requestAnimationFrame === "function") {
      const id = requestAnimationFrame(run);
      pendingTaskCancel = () => cancelAnimationFrame(id);
      return;
    }

    const timeout = setTimeout(run, 16);
    pendingTaskCancel = () => clearTimeout(timeout);
  });
  return pendingPromise;
}

/**
 * Toggles the visibility of a global layout debug panel, which outlines
 * visible DOM elements to aid in debugging layout issues.
 *
 * @summary Applies or removes a CSS class to elements, highlighting the layout,
 * and defers heavy DOM scans to an idle/animation frame to reduce jank.
 *
 * @pseudocode
 * 1. Abort early when `document.body` is unavailable.
 * 2. Update internal state and cancel any pending outline work.
 * 3. When disabling, clear outlines immediately and resolve pending work.
 * 4. When enabling, enqueue outline application on an idle/animation frame.
 * 5. Return a promise that resolves once the outlines have been processed.
 *
 * @param {boolean} enabled - Whether the debug panel should be active.
 * @param {string[]} [selectors=DEFAULT_SELECTORS] - CSS selectors to outline.
 * @returns {Promise<void>} Resolves when outline work has completed (or immediately when disabled).
 */
export function toggleLayoutDebugPanel(enabled, selectors = DEFAULT_SELECTORS) {
  if (typeof document === "undefined" || !document.body) {
    return Promise.resolve();
  }

  enabledState = Boolean(enabled);

  if (!enabledState) {
    cancelPendingTask();
    clearOutlines();
    return Promise.resolve();
  }

  const selectorList = toSelectorList(selectors);
  return scheduleOutlineRender(selectorList);
}

/**
 * @returns {boolean} Current enabled state of the layout debug panel.
 */
export function isLayoutDebugPanelEnabled() {
  return enabledState;
}

/**
 * Await any pending outline work. Exposed for deterministic testing.
 *
 * @returns {Promise<void>}
 */
export function flushLayoutDebugPanelWork() {
  return pendingPromise;
}
