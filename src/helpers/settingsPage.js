/**
 * Set up the Settings page once the document is ready.
 *
 * @pseudocode
 * 1. Load saved settings and available game modes.
 * 2. Apply the stored display mode and motion preference.
 * 3. Initialize the page controls and event listeners.
 */
import { loadSettings, updateSetting } from "./settingsUtils.js";
import { loadGameModes, updateGameModeHidden } from "./gameModeUtils.js";
import { showSettingsError } from "./showSettingsError.js";
import { createToggleSwitch } from "../components/ToggleSwitch.js";
import { applyDisplayMode } from "./displayMode.js";
import { applyMotionPreference } from "./motionUtils.js";
import { onDomReady } from "./domReady.js";

/**
 * Apply a value to a form element.
 *
 * @pseudocode
 * 1. Return when `element` is undefined.
 * 2. Set `checked` for checkboxes or assign `value` for other inputs.
 *
 * @param {HTMLInputElement|HTMLSelectElement|null} element - Form control to update.
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

/**
 * Apply settings values to the provided controls.
 *
 * @pseudocode
 * 1. Call `applyInputState` for each control using values from `settings`.
 * 2. Ignore undefined elements to support missing controls.
 *
 * @param {object} controls - DOM elements for the settings page.
 * @param {HTMLInputElement} [controls.soundToggle] - Sound toggle element.
 * @param {HTMLInputElement} [controls.navToggle] - Navigation map toggle.
 * @param {HTMLInputElement} [controls.motionToggle] - Motion effects toggle.
 * @param {HTMLSelectElement} [controls.displaySelect] - Display mode selector.
 * @param {Settings} settings - Current settings object.
 */
function applyInitialControlValues(controls, settings) {
  applyInputState(controls.soundToggle, settings.sound);
  applyInputState(controls.navToggle, settings.fullNavMap);
  applyInputState(controls.motionToggle, settings.motionEffects);
  applyInputState(controls.displaySelect, settings.displayMode);
}

/**
 * Attach change event listeners to toggle controls.
 *
 * @pseudocode
 * 1. On each control's change event, call `handleUpdate` with the new value.
 *    - For the motion and display controls, also apply the preference
 *      immediately.
 * 2. Use `getCurrentSettings` to access the latest settings for reversion.
 *
 * @param {object} controls - DOM elements for the settings page.
 * @param {HTMLInputElement} [controls.soundToggle]
 * @param {HTMLInputElement} [controls.navToggle]
 * @param {HTMLInputElement} [controls.motionToggle]
 * @param {HTMLSelectElement} [controls.displaySelect]
 * @param {() => Settings} getCurrentSettings - Returns the latest settings.
 * @param {(key: string, value: *, revert: () => void) => void} handleUpdate -
 *        Persists a setting and handles errors.
 */
function attachToggleListeners(controls, getCurrentSettings, handleUpdate) {
  const { soundToggle, navToggle, motionToggle, displaySelect } = controls;

  soundToggle?.addEventListener("change", () => {
    const prev = !soundToggle.checked;
    handleUpdate("sound", soundToggle.checked, () => {
      soundToggle.checked = prev;
    });
  });

  navToggle?.addEventListener("change", () => {
    const prev = !navToggle.checked;
    handleUpdate("fullNavMap", navToggle.checked, () => {
      navToggle.checked = prev;
    });
  });

  motionToggle?.addEventListener("change", () => {
    const prev = !motionToggle.checked;
    applyMotionPreference(motionToggle.checked);
    handleUpdate("motionEffects", motionToggle.checked, () => {
      motionToggle.checked = prev;
      applyMotionPreference(prev);
    });
  });

  displaySelect?.addEventListener("change", () => {
    const previous = getCurrentSettings().displayMode;
    const mode = displaySelect.value;
    applyDisplayMode(mode);
    handleUpdate("displayMode", mode, () => {
      displaySelect.value = previous;
      applyDisplayMode(previous);
    });
  });
}

/**
 * Render toggle switches for game modes and attach listeners.
 *
 * @pseudocode
 * 1. Sort `gameModes` by their `order` property.
 * 2. For each mode, create a toggle using `createToggleSwitch` and append it to
 *    `container`.
 * 3. Determine the initial checked state from current settings or `isHidden`.
 * 4. On change, update the stored game mode settings and persist the hidden
 *    state via `updateGameModeHidden`.
 * 5. Revert the toggle and show an error notification when updates fail.
 *
 * @param {HTMLElement|null} container - Element that will hold the switches.
 * @param {Array} gameModes - Available game modes from storage.
 * @param {() => Settings} getCurrentSettings - Returns the latest settings.
 * @param {(key: string, value: *, revert: () => void) => void} handleUpdate -
 *        Persists updated settings.
 */
function renderGameModeSwitches(container, gameModes, getCurrentSettings, handleUpdate) {
  if (!container || !Array.isArray(gameModes)) return;

  const sortedModes = [...gameModes].sort((a, b) => a.order - b.order);
  sortedModes.forEach((mode) => {
    const current = getCurrentSettings();
    const isChecked = Object.hasOwn(current.gameModes, mode.id)
      ? current.gameModes[mode.id]
      : !mode.isHidden;

    const wrapper = createToggleSwitch(`${mode.name} (${mode.category} - ${mode.order})`, {
      id: `mode-${mode.id}`,
      name: mode.id,
      checked: isChecked,
      ariaLabel: mode.name
    });

    container.appendChild(wrapper);
    const input = wrapper.querySelector("input");

    input.addEventListener("change", () => {
      const prev = !input.checked;
      const updated = {
        ...getCurrentSettings().gameModes,
        [mode.id]: input.checked
      };
      handleUpdate("gameModes", updated, () => {
        input.checked = prev;
      });
      updateGameModeHidden(mode.id, !input.checked).catch((err) => {
        console.error("Failed to update game mode", err);
        input.checked = prev;
        showSettingsError();
      });
    });
  });
}

/**
 * Initialize controls and event wiring for the Settings page.
 *
 * @pseudocode
 * 1. Store a mutable copy of `settings` for updates.
 * 2. Query DOM elements for each control and the mode container.
 * 3. Provide helper functions to read and persist settings.
 * 4. Apply initial values, attach listeners, and render mode switches.
 *
 * @param {Settings} settings - Current settings object.
 * @param {Array} gameModes - Available game mode options.
 */
function initializeControls(settings, gameModes) {
  let currentSettings = { ...settings };

  const controls = {
    soundToggle: document.getElementById("sound-toggle"),
    navToggle: document.getElementById("navmap-toggle"),
    motionToggle: document.getElementById("motion-toggle"),
    displaySelect: document.getElementById("display-mode-select")
  };
  const modesContainer = document.getElementById("game-mode-toggle-container");

  const getCurrentSettings = () => currentSettings;

  function handleUpdate(key, value, revert) {
    updateSetting(key, value)
      .then((updated) => {
        currentSettings = updated;
      })
      .catch((err) => {
        console.error("Failed to update setting", err);
        revert();
        showSettingsError();
      });
  }

  applyInitialControlValues(controls, currentSettings);
  attachToggleListeners(controls, getCurrentSettings, handleUpdate);
  renderGameModeSwitches(modesContainer, gameModes, getCurrentSettings, handleUpdate);
}

async function initializeSettingsPage() {
  try {
    const settings = await loadSettings();
    const gameModes = await loadGameModes();
    applyDisplayMode(settings.displayMode);
    applyMotionPreference(settings.motionEffects);
    initializeControls(settings, gameModes);
  } catch (error) {
    console.error("Error loading settings page:", error);
    showSettingsError();
  }
}

onDomReady(initializeSettingsPage);
