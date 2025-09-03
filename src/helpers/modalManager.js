/**
 * Manage a stack of overlay objects and handle Escape key globally.
 *
 * @pseudocode
 * 1. Maintain an array `stack` of registered overlays with a `close()` method.
 * 2. Listen for `keydown` events on `document`.
 * 3. On `Escape` key:
 *    a. Pop the top overlay from `stack`.
 *    b. If an overlay exists, call its `close()` method.
 *    c. Notify registered callbacks that Escape was handled.
 * 4. Expose functions to register/unregister overlays and to subscribe/unsubscribe to Escape events.
 */
const stack = [];
const escCallbacks = new Set();

function handleKeydown(e) {
  if (e.key !== "Escape") return;
  const top = stack[stack.length - 1];
  if (top) top.close();
  escCallbacks.forEach((cb) => cb());
}

if (typeof document?.addEventListener === "function") {
  document.addEventListener("keydown", handleKeydown);
}

/**
 * Register an overlay so it responds to the shared Escape handler.
 *
 * @pseudocode
 * push `overlay` onto `stack` if not already present
 *
 * @param {{ close: () => void }} overlay
 * @returns {void}
 */
export function registerModal(overlay) {
  if (!stack.includes(overlay)) stack.push(overlay);
}

/**
 * Remove an overlay from the Escape stack.
 *
 * @pseudocode
 * find last index of `overlay` in `stack`
 * IF index >= 0: remove it
 *
 * @param {{ close: () => void }} overlay
 * @returns {void}
 */
export function unregisterModal(overlay) {
  const idx = stack.lastIndexOf(overlay);
  if (idx >= 0) stack.splice(idx, 1);
}

/**
 * Subscribe to Escape events triggered by the manager.
 *
 * @pseudocode
 * add `cb` to `escCallbacks`
 *
 * @param {() => void} cb
 * @returns {void}
 */
export function onEsc(cb) {
  escCallbacks.add(cb);
}

/**
 * Unsubscribe a previously registered Escape callback.
 *
 * @pseudocode
 * delete `cb` from `escCallbacks`
 *
 * @param {() => void} cb
 * @returns {void}
 */
export function offEsc(cb) {
  escCallbacks.delete(cb);
}
