import { isEnabled } from "../featureFlags.js";
import { isTestModeEnabled } from "../testModeUtils.js";
import { guard } from "./guard.js";

/**
 * Reset the global statButtons ready promise and expose its resolver.
 *
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
 * Toggle stat button enabled state and update readiness tracking.
 *
 * @param {NodeListOf<HTMLButtonElement>} statButtons
 * @param {HTMLElement|null} statContainer
 * @param {boolean} enable
 * @param {() => void} resolveReady
 * @param {() => void} resetReady
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
