import { isEnabled, enableFlag } from "../featureFlags.js";

/**
 * Enable an array of stat buttons and mark the container as ready.
 *
 * @pseudocode
 * 1. For each button:
 *    - Set `disabled = false` and `tabIndex = 0` so it is keyboard focusable.
 *    - Remove visual markers `disabled` and `selected`.
 *    - Remove any explicit `background-color` style applied inline.
 * 2. If a `container` element is provided, set `container.dataset.buttonsReady = 'true'`.
 *
 * @param {HTMLElement[]} buttons - Button elements to enable.
 * @param {HTMLElement} [container] - Optional containing element to mark ready.
 * @returns {void}
 */
export function enableStatButtons(buttons, container) {
  buttons.forEach((btn) => {
    btn.disabled = false;
    btn.tabIndex = 0;
    btn.classList.remove("disabled", "selected");
    btn.style.removeProperty("background-color");
  });
  if (container) container.dataset.buttonsReady = "true";
}

/**
 * Disable an array of stat buttons and mark the container as not ready.
 *
 * @pseudocode
 * 1. For each button:
 *    - Set `disabled = true` and `tabIndex = -1` to remove it from tab order.
 *    - Add the visual `disabled` class.
 * 2. If a `container` element is provided, set `container.dataset.buttonsReady = 'false'`.
 *
 * @param {HTMLElement[]} buttons - Button elements to disable.
 * @param {HTMLElement} [container] - Optional containing element to mark not ready.
 * @returns {void}
 */
export function disableStatButtons(buttons, container) {
  buttons.forEach((btn) => {
    btn.disabled = true;
    btn.tabIndex = -1;
    btn.classList.add("disabled");
  });
  if (container) container.dataset.buttonsReady = "false";
}

/**
 * Resolve any promises waiting for stat buttons to be ready.
 *
 * @pseudocode
 * 1. Resolve the target window from the provided argument or global scope.
 * 2. If `target.__resolveStatButtonsReady` exists, invoke it to resolve the waiting promise.
 * 3. Otherwise, assign a resolved promise to `target.statButtonsReadyPromise`.
 * 4. If no target window is available (e.g., Node environments), exit early.
 *
 * @param {Window} [win] - Window object to use for global state. If not provided or undefined, attempts to use global window if available.
 * @returns {void}
 */
export function resolveStatButtonsReady(win) {
  const target = win ?? (typeof window !== "undefined" ? window : undefined);
  if (!target) return;

  if (typeof target.__resolveStatButtonsReady === "function") {
    target.__resolveStatButtonsReady();
  } else {
    target.statButtonsReadyPromise = Promise.resolve();
  }
}

/**
 * Toggle stat buttons enabled state and optionally resolve readiness.
 *
 * @pseudocode
 * 1. If `enable` is truthy:
 *    - Call `enableStatButtons(buttons, container)`.
 *    - Call `resolveReady` callback if provided.
 * 2. Otherwise:
 *    - Call `disableStatButtons(buttons, container)`.
 *    - Call `resetReady` callback if provided.
 *
 * @param {HTMLElement[]} buttons - Buttons to update.
 * @param {HTMLElement} container - Container element for state marking.
 * @param {boolean} enable - True to enable, false to disable.
 * @param {function(): void} [resolveReady] - Optional callback when buttons become ready.
 * @param {function(): void} [resetReady] - Optional callback when buttons are reset.
 * @returns {void}
 */
export function setStatButtonsEnabled(buttons, container, enable, resolveReady, resetReady) {
  if (enable) {
    enableStatButtons(buttons, container);
    resolveReady?.();
  } else {
    disableStatButtons(buttons, container);
    resetReady?.();
  }
}

/**
 * Attach numeric hotkeys (1–5) to stat buttons and return a disposer.
 *
 * @pseudocode
 * 1. Create a keydown handler that:
 *    - Ignores events if the `statHotkeys` feature flag is disabled.
 *    - Ignores events with modifier keys (Alt/Ctrl/Meta) to avoid conflicts.
 *    - Ignores events when focus is inside text inputs/selects/textareas.
 *    - Maps keys '1'..'5' to button indices 0..4 and clicks the button if enabled.
 * 2. Register the handler on `document` and return a cleanup function that removes it.
 *
 * @param {HTMLElement[]} buttons - Buttons mapped to numeric keys 1..5.
 * @returns {() => void} Cleanup function to remove the event listener.
 */
export function wireStatHotkeys(buttons) {
  // Ensure hotkeys are enabled by default; feature flag can still disable.
  try {
    if (!isEnabled("statHotkeys")) enableFlag("statHotkeys");
  } catch {}
  // Expose a deterministic test hook to trigger selection by index
  try {
    if (typeof window !== "undefined") {
      window.__TEST__ = window.__TEST__ || {};
      window.__TEST__.selectStatByIndex = (i) => {
        const btn = buttons && buttons[i];
        if (btn && !btn.disabled) btn.click();
      };
    }
  } catch {}
  const handler = (e) => {
    if (!isEnabled("statHotkeys")) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const active = document.activeElement;
    if (active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) return;
    const idx = e.key >= "1" && e.key <= "5" ? Number(e.key) - 1 : -1;
    const btn = buttons[idx];
    if (btn && !btn.disabled) {
      e.preventDefault();
      btn.click();
    }
  };
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}
