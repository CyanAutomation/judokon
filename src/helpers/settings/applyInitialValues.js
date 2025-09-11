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
 * Initialize control states based on a settings object.
 *
 * @pseudocode
 * 1. For each mapping: update value, tooltip ID, label, and description.
 * 2. Update display mode radio buttons.
 *
 * @param {Object} controls - Collection of form elements.
 * @param {import("../../config/settingsDefaults.js").Settings} settings - Current settings.
 * @param {Record<string, string>} [tooltipMap] - Flattened tooltip lookup.
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
