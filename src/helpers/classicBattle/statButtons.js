import { isEnabled } from "../featureFlags.js";
import { isTestModeEnabled } from "../testModeUtils.js";
import { guard } from "./guard.js";
import { safeCall } from "./safeCall.js";

/**
 * Reset the global statButtons ready promise and expose its resolver.
 *
 * When tests or early initialization need to await the presence of stat
 * buttons, a globally available promise (window.statButtonsReadyPromise) is
 * used. This helper replaces that promise and keeps a resolver on
 * `window.__resolveStatButtonsReady` so callers can resolve it when wiring
 * completes.
 *
 * @pseudocode
 * 1. Create a new Promise and capture its resolver.
 * 2. Store the resolver on `window.__resolveStatButtonsReady` (guarded).
 * 3. Attach the promise to `window.statButtonsReadyPromise` and record an
 *    instrumentation event in `window.__promiseEvents`.
 * 4. Return an object exposing the `resolve` function for consumers.
 *
 * @param {Window} [win=window] - Window-like global to attach the promise to.
 * @returns {{resolve: () => void}} Resolver handle.
 */
export function resetStatButtonsReadyPromise(win = window) {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
    guard(() => {
      win.__resolveStatButtonsReady = r;
    });
  });
  guard(() => {
    win.statButtonsReadyPromise = promise;
    win.__promiseEvents = win.__promiseEvents || [];
    win.__promiseEvents.push({ type: "statButtonsReady-reset", ts: Date.now() });
  });
  return { resolve };
}

/**
 * Resolve the current global `statButtonsReadyPromise`, creating a fresh
 * promise if one is missing.
 *
 * This helper is safe to call from both production wiring and tests. If the
 * global resolver is present it will be invoked; otherwise a new promise is
 * created and immediately resolved so callers never block indefinitely.
 *
 * @pseudocode
 * 1. If `window.__resolveStatButtonsReady` is a function, call it safely.
 * 2. Otherwise, call `resetStatButtonsReadyPromise()` to create a new
 *    promise and immediately resolve it.
 *
 * @param {Window} [win=window] - Window-like global where the resolver may live.
 * @returns {void}
 */
export function resolveStatButtonsReady(win = window) {
  if (typeof win.__resolveStatButtonsReady === "function") {
    safeCall(() => win.__resolveStatButtonsReady());
  } else {
    const { resolve } = resetStatButtonsReadyPromise(win);
    resolve();
  }
}

/**
 * Toggle stat button enabled state and update readiness tracking.
 *
 * @param {NodeListOf<HTMLButtonElement>} statButtons
 * @param {HTMLElement|null} statContainer
 * @param {boolean} enable
 * @param {() => void} resolveReady
 * @param {() => void} resetReady
 */
/**
 * Enable or disable the set of stat buttons and update readiness signals.
 *
 * When enabling the buttons this clears any visual selection and resolves
 * the test-ready promise (via `resolveReady`). When disabling, it invokes
 * `resetReady` so tests can observe the change.
 *
 * @pseudocode
 * 1. For each button: set `disabled`, `tabIndex`, and `disabled` CSS class.
 * 2. If enabling, remove `selected` class and restore visual state.
 * 3. Update `statContainer.dataset.buttonsReady` to reflect the enabled state.
 * 4. Call `resolveReady` when enabling, or `resetReady` when disabling.
 * 5. Emit test-mode console warnings when `isTestModeEnabled()`.
 *
 * @param {NodeListOf<HTMLButtonElement>} statButtons - Buttons to toggle.
 * @param {HTMLElement|null} statContainer - Optional container to store ready flag.
 * @param {boolean} enable - True to enable buttons, false to disable.
 * @param {() => void} resolveReady - Called when buttons become ready.
 * @param {() => void} resetReady - Called when buttons are no longer ready.
 */
export function setStatButtonsEnabled(
  statButtons,
  statContainer,
  enable,
  resolveReady,
  resetReady
) {
  guard(() => {
    if (isTestModeEnabled()) {
      const count = document.querySelectorAll("#stat-buttons .selected").length;
      console.warn(`[test] setEnabled(${enable}): selectedCount=${count}`);
    }
  });

  statButtons.forEach((btn) => {
    btn.disabled = !enable;
    btn.tabIndex = enable ? 0 : -1;
    btn.classList.toggle("disabled", !enable);
    if (enable) {
      guard(() => {
        btn.classList.remove("selected");
        btn.style.removeProperty("background-color");
      });
    }
  });
  if (statContainer) {
    statContainer.dataset.buttonsReady = String(enable);
  }
  if (enable) {
    guard(() => resolveReady?.());
    guard(() => {
      if (isTestModeEnabled()) console.warn("[test] statButtonsReady=true");
    });
  } else {
    guard(() => resetReady?.());
    guard(() => {
      if (isTestModeEnabled()) console.warn("[test] statButtonsReady=false");
    });
  }
}

/**
 * Create a keydown handler that maps number keys to stat button clicks.
 *
 * @param {NodeListOf<HTMLButtonElement>} statButtons
 * @returns {(e: KeyboardEvent) => void}
 */
/**
 * Create a keyboard handler that maps numeric keys 1-5 to stat button clicks.
 *
 * The returned handler guards against modifier keys, and ignores input
 * elements to avoid interfering with text entry. Hotkeys are gated behind
 * the `statHotkeys` feature flag.
 *
 * @pseudocode
 * 1. If `statHotkeys` is disabled, no-op.
 * 2. Ignore events with modifier keys or when focus is in input controls.
 * 3. Map keys "1"-"5" to indices and click the corresponding enabled button.
 *
 * @param {NodeListOf<HTMLButtonElement>} statButtons - Buttons to map to hotkeys.
 * @returns {(e: KeyboardEvent) => void} Keydown event handler.
 */
export function createStatHotkeyHandler(statButtons) {
  return (e) => {
    guard(() => {
      if (!isEnabled("statHotkeys")) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const active = document.activeElement;
      if (active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) return;
      const idx = e.key >= "1" && e.key <= "5" ? Number(e.key) - 1 : -1;
      if (idx < 0 || idx >= statButtons.length) return;
      const target = statButtons[idx];
      if (target && !target.disabled) {
        e.preventDefault();
        target.click();
      }
    });
  };
}
