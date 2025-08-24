// Skip handler management utilities shared across timer orchestration
// and cooldown scheduling.

let skipHandler = null;
let pendingSkip = false;

/**
 * Set the current skip handler and notify listeners of its presence.
 * If a skip was requested before a handler existed, invoking this with
 * a function will immediately trigger it and clear the pending state.
 *
 * @param {null|function(): void|Promise<void>} fn - Handler to invoke when skipping.
 * @returns {void}
 */
export function setSkipHandler(fn) {
  skipHandler = typeof fn === "function" ? fn : null;
  try {
    window.dispatchEvent(
      new CustomEvent("skip-handler-change", {
        detail: { active: Boolean(skipHandler) }
      })
    );
  } catch {}
  if (pendingSkip && skipHandler) {
    // Avoid synchronous re-entrancy into timer callbacks by deferring
    // the actual skip invocation to the next macrotask.
    pendingSkip = false;
    const current = skipHandler;
    skipHandler = null;
    try {
      window.dispatchEvent(new CustomEvent("skip-handler-change", { detail: { active: false } }));
    } catch {}
    setTimeout(() => {
      try {
        current();
      } catch {}
    }, 0);
  }
}

/**
 * Skip the current timer phase if a handler is set. When no handler is
 * available, mark the skip as pending so it runs once a handler is provided.
 *
 * @returns {void}
 */
export function skipCurrentPhase() {
  if (skipHandler) {
    const fn = skipHandler;
    setSkipHandler(null);
    // Defer to avoid executing inside event handlers synchronously.
    setTimeout(() => {
      try {
        fn();
      } catch {}
    }, 0);
  } else {
    pendingSkip = true;
  }
}

/**
 * Reset the skip handler state and notify listeners that no handler is active.
 *
 * @pseudocode
 * 1. Set the internal handler reference to `null`.
 * 2. Clear any pending skip request.
 * 3. Dispatch `skip-handler-change` with `active: false`.
 *
 * @returns {void}
 */
export function resetSkipState() {
  skipHandler = null;
  pendingSkip = false;
  window.dispatchEvent(new CustomEvent("skip-handler-change", { detail: { active: false } }));
}
