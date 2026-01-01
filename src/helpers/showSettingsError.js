/**
 * Display a temporary error popup for settings failures.
 *
 * @pseudocode
 * 1. Find or create a `.settings-error-popup` dialog element.
 * 2. Set the error message and toggle the `open` attribute.
 * 3. Clear the dialog after the CSS animation completes.
 */
const errorPopupAnimationName = "settings-error-popup-fade";
const animationHandlers = new WeakMap();

/**
 * Show a transient settings error popup to the user.
 *
 * This function creates an accessible alert element, appends it to the
 * document body, and schedules fade and removal timers so the popup
 * visibly appears then disappears after the configured durations.
 *
 * @pseudocode
 * 1. Find an existing `.settings-error-popup` dialog or create one if missing.
 * 2. Set accessibility attributes and message text.
 * 3. Toggle the `open` attribute to trigger the CSS animation.
 * 4. On animation end, clear the text and close the dialog.
 *
 * Contract:
 * - Input: none.
 * - Output: DOM side-effects.
 * - Errors: run silently in non-DOM environments (no-ops).
 *
 * @param {string} [message="Failed to update settings."] - Error message to display.
 * @returns {void}
 */
export function showSettingsError(message = "Failed to update settings.") {
  if (typeof document === "undefined") {
    return;
  }

  let popup = document.querySelector(".settings-error-popup");
  if (!popup) {
    popup = document.createElement("dialog");
    popup.className = "settings-error-popup";
    popup.id = "settings-error-popup";
    popup.setAttribute("role", "alertdialog");
    popup.setAttribute("aria-live", "assertive");
    document.body.appendChild(popup);
  }

  if (!animationHandlers.has(popup)) {
    const handler = (event) => {
      if (event.animationName !== errorPopupAnimationName) {
        return;
      }
      popup.removeAttribute("open");
      popup.textContent = "";
    };
    animationHandlers.set(popup, handler);
    popup.addEventListener("animationend", handler);
  }

  popup.textContent = message;
  popup.removeAttribute("open");
  if (popup.isConnected) {
    void popup.offsetWidth;
  }
  popup.setAttribute("open", "");
}
