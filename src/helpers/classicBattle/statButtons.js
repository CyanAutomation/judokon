import { isEnabled } from "../featureFlags.js";

/** Enable stat buttons. @pseudocode Enable each button, clear disabled styling, mark container ready. */
export function enableStatButtons(buttons, container) {
  buttons.forEach((btn) => {
    btn.disabled = false;
    btn.tabIndex = 0;
    btn.classList.remove("disabled", "selected");
    btn.style.removeProperty("background-color");
  });
  if (container) container.dataset.buttonsReady = "true";
}

/** Disable stat buttons. @pseudocode Disable each button, apply disabled styling, mark container not ready. */
export function disableStatButtons(buttons, container) {
  buttons.forEach((btn) => {
    btn.disabled = true;
    btn.tabIndex = -1;
    btn.classList.add("disabled");
  });
  if (container) container.dataset.buttonsReady = "false";
}

/** Resolve stat button readiness. @pseudocode Call global resolver or create resolved promise. */
export function resolveStatButtonsReady(win = window) {
  if (typeof win.__resolveStatButtonsReady === "function") {
    win.__resolveStatButtonsReady();
  } else {
    win.statButtonsReadyPromise = Promise.resolve();
  }
}

/**
 * Set stat buttons enabled state.
 * @pseudocode When enabling, call enable helper and resolver; otherwise disable and reset.
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

/** Attach numeric hotkeys 1–5.
 * @pseudocode If flag disabled or focus in input, ignore; on keydown without modifiers, click matching enabled button; return cleanup.
 */
export function wireStatHotkeys(buttons) {
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
