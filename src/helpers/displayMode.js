/**
 * Applies the chosen display mode to the document body, updating theme-related
 * data attributes and CSS classes.
 *
 * @summary This function ensures the UI reflects the selected visual theme,
 * handling legacy mode names and providing validation.
 *
 * @pseudocode
 * 1. Define an array of valid display modes: "light", "dark", "retro".
 * 2. If the input `mode` is "high-contrast", remap it to "retro" for backward compatibility and log a console info message.
 * 3. Validate the `mode`: if it's not one of the `validModes`, log a warning and exit.
 * 4. Set the `data-theme` attribute on `document.body` to the resolved `mode`.
 * 5. Iterate through all `validModes` and remove any existing `${mode}-mode` CSS classes from `document.body`.
 * 6. Add the CSS class corresponding to the resolved `mode` (e.g., `light-mode`, `dark-mode`, `retro-mode`) to `document.body`.
 *
 * @param {"light"|"dark"|"retro"|"high-contrast"} mode - The desired display mode. "high-contrast" is accepted as an alias for "retro".
 * @returns {void}
 */
export function applyDisplayMode(mode) {
  const validModes = ["light", "dark", "retro"];
  if (mode === "high-contrast") {
    // Backward compatibility: map legacy setting to the new "retro" theme.
    mode = "retro";
    // Intentionally do not spam logs in production; tests may stub this if needed.
    console && console.info && console.info('displayMode: mapped "high-contrast" to "retro"');
  }
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
