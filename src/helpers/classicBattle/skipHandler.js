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
  window.dispatchEvent(
    new CustomEvent("skip-handler-change", {
      detail: { active: Boolean(skipHandler) }
    })
  );
  if (pendingSkip && skipHandler) {
    pendingSkip = false;
    const current = skipHandler;
    skipHandler = null;
    window.dispatchEvent(new CustomEvent("skip-handler-change", { detail: { active: false } }));
    current();
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
    fn();
  } else {
    pendingSkip = true;
  }
}
