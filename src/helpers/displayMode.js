/**
 * Applies the chosen display mode to the document body, updating theme-related
 * data attributes and CSS classes.
 *
 * @summary This function ensures the UI reflects the selected visual theme,
 * handling legacy mode names and providing validation.
 *
 * @pseudocode
 * 1. Normalize the requested `mode` so legacy values ("retro", "high-contrast") map to "dark".
 * 2. Validate the normalized `mode`: if it's not one of the allowed modes, log a warning and exit.
 * 3. Set the `data-theme` attribute on `document.body` to the normalized `mode`.
 * 4. Iterate through all allowed modes and remove their CSS classes from `document.body`.
 * 5. Add the CSS class corresponding to the normalized `mode` (e.g., `light-mode`, `dark-mode`).
 *
 * @param {string} mode - The desired display mode, potentially including legacy aliases.
 * @returns {void}
 */
export function applyDisplayMode(mode) {
  const normalizedMode = normalizeDisplayMode(mode);
  if (!normalizedMode) {
    const validModes = VALID_DISPLAY_MODES.join(", ");
    console.warn(`Invalid display mode: "${mode}". Valid modes are: ${validModes}.`);
    return;
  }
  document.body.dataset.theme = normalizedMode;
  for (const m of CLASSES_TO_CLEAR) {
    document.body.classList.remove(`${m}-mode`);
  }
  document.body.classList.add(`${normalizedMode}-mode`);
}

const VALID_DISPLAY_MODES = ["light", "dark"];
const LEGACY_DISPLAY_MODE_MAP = new Map([
  ["retro", "dark"],
  ["high-contrast", "dark"]
]);
const CLASSES_TO_CLEAR = new Set([...VALID_DISPLAY_MODES, ...LEGACY_DISPLAY_MODE_MAP.keys()]);

/**
 * Normalize a requested display mode to one of the supported runtime values.
 *
 * @summary Ensures legacy values remain functional while constraining runtime themes to Light or Dark.
 *
 * @pseudocode
 * 1. If `mode` is not a string, return `null`.
 * 2. Lowercase the requested `mode` for comparison.
 * 3. If the mode is already allowed, return it.
 * 4. If the mode exists in the legacy map, log an informational message and return the mapped value.
 * 5. Otherwise, return `null` to indicate an unsupported mode.
 *
 * @param {unknown} mode - User requested display mode.
 * @returns {"light"|"dark"|null} Normalized mode or `null` when unsupported.
 */
export function normalizeDisplayMode(mode) {
  if (typeof mode !== "string") {
    return null;
  }
  const normalized = mode.toLowerCase();
  if (VALID_DISPLAY_MODES.includes(normalized)) {
    return normalized;
  }
  if (LEGACY_DISPLAY_MODE_MAP.has(normalized)) {
    const mapped = LEGACY_DISPLAY_MODE_MAP.get(normalized);
    if (mode !== mapped && console && console.info) {
      console.info(`displayMode: mapped legacy value "${mode}" to "${mapped}"`);
    }
    return mapped ?? null;
  }
  return null;
}
