/**
 * Set up the Settings page once the document is ready.
 *
 * @pseudocode
 * 1. Load saved settings and available game modes.
 * 2. Apply the stored display mode and motion preference.
 * 3. Initialize the page controls and event listeners.
 */
import { loadSettings, updateSetting } from "./settingsUtils.js";
import { loadGameModes } from "./gameModeUtils.js";
import { showSettingsError } from "./showSettingsError.js";
import { applyDisplayMode } from "./displayMode.js";
import { applyMotionPreference } from "./motionUtils.js";
import { onDomReady } from "./domReady.js";
import { initTooltips } from "./tooltip.js";

import {
  applyInitialControlValues,
  attachToggleListeners,
  renderGameModeSwitches,
  renderFeatureFlagSwitches,
  setupSectionToggles
} from "./settings/index.js";

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
  const flagsContainer = document.getElementById("feature-flags-container");
  const errorPopup = document.getElementById("settings-error-popup");

  const getCurrentSettings = () => currentSettings;

  function showErrorAndRevert(revert) {
    if (typeof revert === "function") revert();
    if (errorPopup) {
      errorPopup.textContent = "Failed to update settings. Please try again.";
      errorPopup.style.display = "block";
      setTimeout(() => {
        errorPopup.style.display = "none";
        errorPopup.textContent = "";
      }, 3000);
    }
  }

  function handleUpdate(key, value, revert) {
    updateSetting(key, value)
      .then((updated) => {
        currentSettings = updated;
      })
      .catch((err) => {
        console.error("Failed to update setting", err);
        showErrorAndRevert(revert);
      });
  }

  applyInitialControlValues(controls, currentSettings);
  attachToggleListeners(controls, getCurrentSettings, handleUpdate);
  renderGameModeSwitches(modesContainer, gameModes, getCurrentSettings, handleUpdate);
  renderFeatureFlagSwitches(
    flagsContainer,
    currentSettings.featureFlags,
    getCurrentSettings,
    handleUpdate
  );
}

async function initializeSettingsPage() {
  try {
    const settings = await loadSettings();
    const gameModes = await loadGameModes();
    applyDisplayMode(settings.displayMode);
    applyMotionPreference(settings.motionEffects);
    initializeControls(settings, gameModes);
    setupSectionToggles();
    initTooltips();
  } catch (error) {
    console.error("Error loading settings page:", error);
    const errorPopup = document.getElementById("settings-error-popup");
    if (errorPopup) {
      errorPopup.textContent = "Failed to load settings. Please refresh the page.";
      errorPopup.style.display = "block";
    }
    showSettingsError();
  }
}

onDomReady(initializeSettingsPage);
