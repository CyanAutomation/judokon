import { DEFAULT_SETTINGS } from "../../config/settingsDefaults.js";
import { loadSettings } from "../../config/loadSettings.js";

/**
 * Apply a value to an input or checkbox element.
 *
 * @pseudocode
 * 1. Exit early when `element` is null or undefined.
 * 2. For checkboxes, set the `checked` property based on `value`.
 * 3. For other inputs, assign the `value` directly.
 *
 * @param {HTMLInputElement|HTMLSelectElement|null} element - Control to update.
 * @param {*} value - Value to apply.
 */
export function applyInputState(element, value) {
  if (!element) return;
  if (element.type === "checkbox") {
    element.checked = Boolean(value);
  } else {
    element.value = value;
  }
}

/**
 * Initialize control states based on a settings object.
 *
 * @pseudocode
 * 1. Call `applyInputState` for each setting-related control.
 *
 * @param {Object} controls - Collection of form elements.
 * @param {import("../../config/settingsDefaults.js").Settings} settings - Current settings.
 * @param {Record<string, string>} [tooltipMap] - Flattened tooltip lookup.
 */
export function applyInitialControlValues(controls, settings = DEFAULT_SETTINGS, tooltipMap = {}) {
  applyInputState(controls.soundToggle, settings.sound);
  if (controls.soundToggle && settings.tooltipIds?.sound) {
    controls.soundToggle.dataset.tooltipId = settings.tooltipIds.sound;
  }
  const soundLabel = tooltipMap["settings.sound.label"];
  const soundDesc = tooltipMap["settings.sound.description"];
  const soundLabelEl = controls.soundToggle?.closest("label")?.querySelector("span");
  const soundDescEl = document.getElementById("sound-desc");
  if (soundLabel && soundLabelEl) soundLabelEl.textContent = soundLabel;
  if (soundDesc && soundDescEl) soundDescEl.textContent = soundDesc;
  applyInputState(controls.motionToggle, settings.motionEffects);
  if (controls.motionToggle && settings.tooltipIds?.motionEffects) {
    controls.motionToggle.dataset.tooltipId = settings.tooltipIds.motionEffects;
  }
  const motionLabel = tooltipMap["settings.motionEffects.label"];
  const motionDesc = tooltipMap["settings.motionEffects.description"];
  const motionLabelEl = controls.motionToggle?.closest("label")?.querySelector("span");
  const motionDescEl = document.getElementById("motion-desc");
  if (motionLabel && motionLabelEl) motionLabelEl.textContent = motionLabel;
  if (motionDesc && motionDescEl) motionDescEl.textContent = motionDesc;
  if (controls.displayRadios) {
    controls.displayRadios.forEach((radio) => {
      const isSelected = radio.value === settings.displayMode;
      radio.checked = isSelected;
      radio.tabIndex = isSelected ? 0 : -1;
    });
  }
  applyInputState(controls.typewriterToggle, settings.typewriterEffect);
  if (controls.typewriterToggle && settings.tooltipIds?.typewriterEffect) {
    controls.typewriterToggle.dataset.tooltipId = settings.tooltipIds.typewriterEffect;
  }
  const typeLabel = tooltipMap["settings.typewriterEffect.label"];
  const typeDesc = tooltipMap["settings.typewriterEffect.description"];
  const typeLabelEl = controls.typewriterToggle?.closest("label")?.querySelector("span");
  const typeDescEl = document.getElementById("typewriter-desc");
  if (typeLabel && typeLabelEl) typeLabelEl.textContent = typeLabel;
  if (typeDesc && typeDescEl) typeDescEl.textContent = typeDesc;
  applyInputState(controls.tooltipsToggle, settings.tooltips);
  if (controls.tooltipsToggle && settings.tooltipIds?.tooltips) {
    controls.tooltipsToggle.dataset.tooltipId = settings.tooltipIds.tooltips;
  }
  const tipsLabel = tooltipMap["settings.tooltips.label"];
  const tipsDesc = tooltipMap["settings.tooltips.description"];
  const tipsLabelEl = controls.tooltipsToggle?.closest("label")?.querySelector("span");
  const tipsDescEl = document.getElementById("tooltips-desc");
  if (tipsLabel && tipsLabelEl) tipsLabelEl.textContent = tipsLabel;
  if (tipsDesc && tipsDescEl) tipsDescEl.textContent = tipsDesc;
  applyInputState(controls.cardOfTheDayToggle, settings.showCardOfTheDay);
  if (controls.cardOfTheDayToggle && settings.tooltipIds?.showCardOfTheDay) {
    controls.cardOfTheDayToggle.dataset.tooltipId = settings.tooltipIds.showCardOfTheDay;
  }
  const cardLabel = tooltipMap["settings.showCardOfTheDay.label"];
  const cardDesc = tooltipMap["settings.showCardOfTheDay.description"];
  const cardLabelEl = controls.cardOfTheDayToggle?.closest("label")?.querySelector("span");
  const cardDescEl = document.getElementById("card-of-the-day-desc");
  if (cardLabel && cardLabelEl) cardLabelEl.textContent = cardLabel;
  if (cardDesc && cardDescEl) cardDescEl.textContent = cardDesc;
  applyInputState(controls.fullNavigationMapToggle, settings.fullNavigationMap);
  if (controls.fullNavigationMapToggle && settings.tooltipIds?.fullNavigationMap) {
    controls.fullNavigationMapToggle.dataset.tooltipId = settings.tooltipIds.fullNavigationMap;
  }
  const mapLabel = tooltipMap["settings.fullNavigationMap.label"];
  const mapDesc = tooltipMap["settings.fullNavigationMap.description"];
  const mapLabelEl = controls.fullNavigationMapToggle?.closest("label")?.querySelector("span");
  const mapDescEl = document.getElementById("full-navigation-map-desc");
  if (mapLabel && mapLabelEl) mapLabelEl.textContent = mapLabel;
  if (mapDesc && mapDescEl) mapDescEl.textContent = mapDesc;
}

/**
 * Load settings and apply them to controls.
 *
 * @param {Object} controls - Collection of form elements.
 * @param {Record<string, string>} [tooltipMap] - Flattened tooltip lookup.
 * @returns {Promise<import("../../config/settingsDefaults.js").Settings>} Resolved settings.
 */
export async function applyInitialValues(controls, tooltipMap = {}) {
  const settings = await loadSettings().catch(() => DEFAULT_SETTINGS);
  applyInitialControlValues(controls, settings, tooltipMap);
  return settings;
}
