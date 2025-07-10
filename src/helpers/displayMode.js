/**
 * Apply the chosen display mode by setting a theme data attribute on the body.
 *
 * @pseudocode
 * 1. Verify that `mode` is one of "light", "dark", or "gray".
 *    - If the value is invalid, log a warning and exit early.
 *
 * 2. Set `document.body.dataset.theme` to the provided mode value.
 *
 * @param {"light"|"dark"|"gray"} mode - Desired display mode.
 */
export function applyDisplayMode(mode) {
  const validModes = ["light", "dark", "gray"];
  if (!validModes.includes(mode)) {
    console.warn(`Invalid display mode: "${mode}". Valid modes are: ${validModes.join(", ")}.`);
    return;
  }
  document.body.dataset.theme = mode;
}
