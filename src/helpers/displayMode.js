/**
 * Apply the chosen display mode by setting a theme data attribute on the body.
 *
 * @pseudocode
 * 1. Normalize legacy values: if `mode === "high-contrast"`, map to `"retro"`.
 * 2. Validate `mode` is one of "light", "dark", or "retro"; warn and bail if invalid.
 * 3. Set `document.body.dataset.theme = mode`.
 * 4. Remove any existing `*-mode` classes then add the corresponding `${mode}-mode` class.
 *
 * @param {"light"|"dark"|"retro"|"high-contrast"} mode - Desired display mode; "high-contrast" is accepted as an alias for backward compatibility.
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
