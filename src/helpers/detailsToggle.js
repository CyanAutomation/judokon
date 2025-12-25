/**
 * Toggle a <details> element by clicking its summary when possible.
 *
 * @pseudocode
 * 1. Exit early when no details element is provided.
 * 2. If the current open state already matches `shouldOpen`, return.
 * 3. Click the summary/toggle element when available.
 * 4. If the click does not change state, set/remove the `open` attribute.
 * 5. Return whether a toggle was attempted.
 *
 * @param {HTMLDetailsElement | null} details - Details element to toggle.
 * @param {boolean} shouldOpen - Desired open state.
 * @param {{ toggle?: HTMLElement | null }} [options]
 * @returns {boolean} Whether a toggle attempt occurred.
 */
export function setDetailsOpen(details, shouldOpen, options = {}) {
  if (!details || typeof details.open !== "boolean") {
    return false;
  }

  const desired = Boolean(shouldOpen);
  if (details.open === desired) {
    return false;
  }

  const toggle = options.toggle ?? details.querySelector("summary");
  const wasOpen = details.open;

  if (toggle && typeof toggle.click === "function") {
    toggle.click();
  }

  if (details.open === wasOpen) {
    if (desired) {
      details.setAttribute("open", "");
    } else {
      details.removeAttribute("open");
    }
  }

  return details.open !== wasOpen;
}
