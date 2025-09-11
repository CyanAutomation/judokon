import { DEFAULT_SETTINGS } from "../../config/settingsDefaults.js";
import { loadSettings } from "../../config/loadSettings.js";

const CONTROL_MAP = [
  { control: "soundToggle", setting: "sound", descId: "sound-desc" },
  { control: "motionToggle", setting: "motionEffects", descId: "motion-desc" },
  { control: "typewriterToggle", setting: "typewriterEffect", descId: "typewriter-desc" },
  { control: "tooltipsToggle", setting: "tooltips", descId: "tooltips-desc" },
  { control: "cardOfTheDayToggle", setting: "showCardOfTheDay", descId: "card-of-the-day-desc" },
  {
    control: "fullNavigationMapToggle",
    setting: "fullNavigationMap",
    descId: "full-navigation-map-desc"
  }
];

/**
 * Applies initial values from a settings object to corresponding form controls
 * and updates their associated labels and descriptions based on a tooltip map.
 *
 * @summary This function ensures that the settings page UI accurately reflects
 * the current application settings when loaded.
 *
 * @pseudocode
 * 1. Define an inner helper function `applyInputState(element, value)`:
 *    a. If `element` is null, return.
 *    b. If `element` is a checkbox, set its `checked` property to `Boolean(value)`.
 *    c. Otherwise, set its `value` property directly.
 * 2. Iterate over `CONTROL_MAP`, which defines the mapping between control names, setting keys, and description IDs.
 * 3. For each mapping:
 *    a. Get the control element from `controls`.
 *    b. Call `applyInputState` to set the control's value based on `settings[setting]`.
 *    c. If the control exists and `settings.tooltipIds` has an entry for the `setting`, set the control's `data-tooltip-id`.
 *    d. Locate the associated label and description elements.
 *    e. If a localized `label` and `description` are found in `tooltipMap`, update the `textContent` of the label and description elements.
 * 4. If `controls.displayRadios` exists (for display mode selection):
 *    a. Iterate over each radio button.
 *    b. Set `checked` to `true` if the radio's `value` matches `settings.displayMode`.
 *    c. Set `tabIndex` to `0` for the checked radio and `-1` for others to manage keyboard navigation.
 *
 * @param {Object} controls - An object containing references to various form elements (e.g., `controls.soundToggle`, `controls.displayRadios`).
 * @param {import("../../config/settingsDefaults.js").Settings} [settings=DEFAULT_SETTINGS] - The current application settings object. Defaults to `DEFAULT_SETTINGS`.
 * @param {Record<string, string>} [tooltipMap={}] - A flattened map of tooltip IDs to their localized text content.
 * @returns {void}
 */
export function applyInitialControlValues(controls, settings = DEFAULT_SETTINGS, tooltipMap = {}) {
  /**
   * Apply a value to an input or checkbox element.
   *
   * @private
   * @pseudocode
   * 1. Exit early when `element` is null or undefined.
   * 2. For checkboxes, set the `checked` property based on `value`.
   * 3. For other inputs, assign the `value` directly.
   *
   * @param {HTMLInputElement|HTMLSelectElement|null} element - Control to update.
   * @param {*} value - Value to apply.
   */
  function applyInputState(element, value) {
    if (!element) return;
    if (element.type === "checkbox") {
      element.checked = Boolean(value);
    } else {
      element.value = value;
    }
  }

  CONTROL_MAP.forEach(({ control, setting, descId }) => {
    const el = controls[control];
    applyInputState(el, settings[setting]);

    if (el && settings.tooltipIds?.[setting]) {
      el.dataset.tooltipId = settings.tooltipIds[setting];
    }

    const labelEl = el?.closest("label")?.querySelector("span");
    const descEl = document.getElementById(descId);
    const label = tooltipMap[`settings.${setting}.label`];
    const desc = tooltipMap[`settings.${setting}.description`];
    if (label && labelEl) labelEl.textContent = label;
    if (desc && descEl) descEl.textContent = desc;
  });

  if (controls.displayRadios) {
    controls.displayRadios.forEach((radio) => {
      radio.checked = radio.value === settings.displayMode;
      radio.tabIndex = radio.checked ? 0 : -1;
    });
  }
}

/**
 * Load settings and apply them to controls.
 *
 * @param {Object} controls - Collection of form elements.
 * @param {Record<string, string>} [tooltipMap] - Flattened tooltip lookup.
 * @returns {Promise<import("../../config/settingsDefaults.js").Settings>} Resolved settings.
 * @pseudocode
 * 1. Load settings, falling back to defaults on error.
 * 2. Apply the loaded settings to the controls.
 * 3. Return the settings.
 */
export async function applyInitialValues(controls, tooltipMap = {}) {
  const settings = await loadSettings().catch(() => DEFAULT_SETTINGS);
  applyInitialControlValues(controls, settings, tooltipMap);
  return settings;
}
