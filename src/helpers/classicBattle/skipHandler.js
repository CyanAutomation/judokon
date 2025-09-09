// Skip handler management utilities shared across timer orchestration
// and cooldown scheduling.

let skipHandler = null;
let pendingSkip = false;

/**
 * Register or clear the global skip handler used by timer and cooldown logic.
 *
 * The skip handler is a short callback that advances or cancels the current
 * phase (for example stopping a timer). Tests can request a skip before a
 * handler exists; in that case the skip is recorded as `pendingSkip` and will
 * be invoked immediately when a handler is registered.
 *
 * @pseudocode
 * 1. Accept a function `fn` and set the module-scoped `skipHandler` to `fn` or `null`.
 * 2. Dispatch a `skip-handler-change` CustomEvent with `detail.active` to notify listeners.
 * 3. If a skip was previously requested (`pendingSkip`) and a handler is now set,
 *    clear `pendingSkip` and synchronously invoke the handler so tests observe it.
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
    // Immediately consume the pending skip by invoking the handler.
    // Call synchronously so tests observe the invocation right after
    // `setSkipHandler` returns (the handler itself may decide to defer work).
    pendingSkip = false;
    try {
      skipHandler && skipHandler();
    } catch {}
  }
}

/**
 * Invoke the registered skip handler or record a pending skip.
 *
 * @pseudocode
 * 1. If a handler is registered:
 *    - Capture the handler in a local variable and clear the global
 *      reference by calling `setSkipHandler(null)`.
 *    - Defer the invocation with `setTimeout(..., 0)` to avoid
 *      reentrancy inside event handlers and make the state observable
 *      by synchronous tests.
 * 2. If no handler is registered, set `pendingSkip = true` so the next
 *    call to `setSkipHandler` will immediately consume it.
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
