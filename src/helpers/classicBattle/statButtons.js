import { isEnabled, featureFlagsEmitter } from "../featureFlags.js";

/**
 * Normalize assorted button collections into a clean array of elements.
 *
 * @summary Collects stat button references for the exported enable/disable helpers.
 * @remarks Corrects prior documentation that described enabling logic rather than normalization.
 *
 * @pseudocode
 * 1. If `buttons` is falsy, return an empty array.
 * 2. If `buttons` is already an array, filter out falsy entries and return it.
 * 3. Otherwise convert `buttons` (e.g., NodeList) to an array and filter out falsy entries.
 *
 * @param {HTMLElement[] | NodeListOf<HTMLElement> | null | undefined} buttons -
 *   Collection of button-like values to normalize.
 * @returns {HTMLElement[]} An array of valid button elements.
 */
function toButtonArray(buttons) {
  if (!buttons) return [];
  if (Array.isArray(buttons)) return buttons.filter(Boolean);
  return Array.from(buttons).filter(Boolean);
}

function applyDisabledState(btn, disabled) {
  if (!btn) {
    console.log("[applyDisabledState] No button provided");
    return;
  }
  console.log(
    "[applyDisabledState] Setting disabled =",
    disabled,
    "for button:",
    btn.dataset?.stat
  );
  try {
    btn.disabled = disabled;
    console.log("[applyDisabledState] After setting, btn.disabled =", btn.disabled);
    btn.tabIndex = disabled ? -1 : 0;
    if (disabled) {
      if (btn.classList && typeof btn.classList.add === "function") {
        btn.classList.add("disabled");
      }
    } else {
      if (btn.classList && typeof btn.classList.remove === "function") {
        btn.classList.remove("disabled");
      }
    }
  } catch (error) {
    // Silently handle errors to prevent disrupting the game flow
    try {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("Failed to apply disabled state:", error);
      }
    } catch {
      // Ignore logging errors
    }
  }
}

/**
 * Enable stat buttons and flag the container as ready for interaction.
 *
 * @pseudocode
 * 1. Normalize `buttons` into an array via `toButtonArray`.
 * 2. For each button:
 *    - Call `applyDisabledState(btn, false)` to re-enable focus/interaction.
 *    - Remove the `selected` CSS class.
 *    - Remove any inline `background-color` styles.
 * 3. If a `container` is provided, set `container.dataset.buttonsReady = 'true'`.
 *
 * @param {HTMLElement[] | NodeListOf<HTMLElement> | null | undefined} buttons -
 *   Buttons to re-enable.
 * @param {HTMLElement} [container] - Optional container that tracks readiness state.
 * @returns {void}
 */
export function enableStatButtons(buttons, container) {
  console.log("[enableStatButtons] Called with", toButtonArray(buttons).length, "buttons");

  // Save stack trace for debugging
  if (typeof window !== "undefined") {
    window.__enableStackTraces = window.__enableStackTraces || [];
    window.__enableStackTraces.push({
      time: Date.now(),
      stack: new Error().stack
    });
  }

  toButtonArray(buttons).forEach((btn) => {
    applyDisabledState(btn, false);
    btn.classList.remove("selected");
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
  const buttonArray = toButtonArray(buttons);
  console.debug("disableStatButtons called with", buttonArray.length, "buttons");
  window.__disableStatButtonsCalled = true; // Track for debugging
  window.__disableStatButtonsCount = buttonArray.length;
  buttonArray.forEach((btn) => {
    applyDisabledState(btn, true);
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

const HOTKEY_INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function exposeHotkeyTestHook(buttons) {
  try {
    if (typeof window === "undefined") {
      return;
    }
    const target = (window.__TEST__ = window.__TEST__ || {});
    target.selectStatByIndex = (i) => {
      const btn = buttons && buttons[i];
      if (btn && !btn.disabled) {
        btn.click();
      }
    };
  } catch {}
}

function createHotkeyHandler(buttons) {
  return (e) => {
    if (!isEnabled("statHotkeys")) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const active = document.activeElement;
    if (active && HOTKEY_INPUT_TAGS.has(active.tagName)) return;
    const idx = e.key >= "1" && e.key <= "5" ? Number(e.key) - 1 : -1;
    const btn = buttons[idx];
    if (btn && !btn.disabled) {
      e.preventDefault();
      btn.click();
    }
  };
}

function subscribeToFlagChanges(listener) {
  if (!featureFlagsEmitter || typeof featureFlagsEmitter.addEventListener !== "function") {
    return () => {};
  }
  featureFlagsEmitter.addEventListener("change", listener);
  return () => {
    try {
      featureFlagsEmitter.removeEventListener("change", listener);
    } catch {}
  };
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
  exposeHotkeyTestHook(buttons);

  const canBindHotkeys =
    typeof document !== "undefined" && typeof document.addEventListener === "function";
  if (!canBindHotkeys) {
    return () => {};
  }

  const handler = createHotkeyHandler(buttons);
  let handlerAttached = false;

  const attachHotkeys = () => {
    if (handlerAttached || !isEnabled("statHotkeys")) {
      return;
    }
    document.addEventListener("keydown", handler);
    handlerAttached = true;
  };

  const detachHotkeys = () => {
    if (!handlerAttached) {
      return;
    }
    document.removeEventListener("keydown", handler);
    handlerAttached = false;
  };

  const syncHotkeyBinding = () => {
    if (isEnabled("statHotkeys")) {
      attachHotkeys();
    } else {
      detachHotkeys();
    }
  };

  syncHotkeyBinding();
  const unsubscribe = subscribeToFlagChanges(() => {
    try {
      syncHotkeyBinding();
    } catch {}
  });

  return () => {
    detachHotkeys();
    unsubscribe();
  };
}
