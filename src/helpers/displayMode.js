/**
 * Apply the chosen display mode by setting a theme data attribute on the body.
 *
 * @pseudocode
 * 1. Verify that `mode` is one of "light", "dark", or "high-contrast".
 *    - If the value is invalid, log a warning and exit early.
 *
 * 2. Set `document.body.dataset.theme` to the provided mode value.
 * 3. Remove any existing `*-mode` classes from `document.body` and add the
 *    class corresponding to the new mode (e.g. `dark-mode`).
 *
 * @param {"light"|"dark"|"high-contrast"} mode - Desired display mode.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function applyDisplayMode(mode) {
  const validModes = ["light", "dark", "high-contrast"];
  if (!validModes.includes(mode)) {
    console.warn(`Invalid display mode: "${mode}". Valid modes are: ${validModes.join(", ")}.`);
    return;
  }
  document.body.dataset.theme = mode;
  for (const m of validModes) {
    document.body.classList.remove(`${m}-mode`);
  }
  document.body.classList.add(`${mode}-mode`);
}
