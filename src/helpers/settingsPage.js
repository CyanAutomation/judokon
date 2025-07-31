/**
 * Set up the Settings page once the document is ready.
 *
 * @pseudocode
 * 1. Load saved settings and available navigation items.
 * 2. Apply the stored display mode and motion preference.
 * 3. Initialize the page controls and event listeners.
 */
import { loadSettings, updateSetting, resetSettings } from "./settingsUtils.js";
import { loadNavigationItems } from "./gameModeUtils.js";
import { showSettingsError } from "./showSettingsError.js";
import { applyDisplayMode } from "./displayMode.js";
import { withViewTransition } from "./viewTransition.js";
import { applyMotionPreference } from "./motionUtils.js";
import { onDomReady } from "./domReady.js";
import { initTooltips } from "./tooltip.js";
import { createModal } from "../components/Modal.js";
import { createButton } from "../components/Button.js";

import {
  applyInitialControlValues,
  attachToggleListeners,
  renderGameModeSwitches,
  renderFeatureFlagSwitches,
  setupSectionToggles
} from "./settings/index.js";

/**
 * Build a confirmation modal for restoring default settings.
 *
 * @pseudocode
 * 1. Create heading and description nodes.
 * 2. Create Cancel and Yes buttons via `createButton`.
 * 3. Assemble modal with `createModal` and wire button handlers.
 *    - Cancel closes the modal.
 *    - Yes calls `onConfirm` then closes.
 * 4. Append the modal element to `document.body`.
 * 5. Return the modal API.
 *
 * @param {Function} onConfirm - Called when user confirms reset.
 * @returns {{ open(trigger?: HTMLElement): void }} Modal controls.
 */
function createResetConfirmation(onConfirm) {
  const title = document.createElement("h2");
  title.id = "reset-modal-title";
  title.textContent = "Restore default settings?";

  const desc = document.createElement("p");
  desc.id = "reset-modal-desc";
  desc.textContent = "This will clear all saved preferences.";

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const cancel = createButton("Cancel", {
    id: "cancel-reset-button",
    className: "secondary-button"
  });
  const yes = createButton("Yes", { id: "confirm-reset-button" });
  actions.append(cancel, yes);

  const frag = document.createDocumentFragment();
  frag.append(title, desc, actions);

  const modal = createModal(frag, { labelledBy: title, describedBy: desc });
  cancel.addEventListener("click", modal.close);
  yes.addEventListener("click", () => {
    onConfirm();
    modal.close();
  });
  document.body.appendChild(modal.element);
  return modal;
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
    motionToggle: document.getElementById("motion-toggle"),
    displayRadios: document.querySelectorAll('input[name="display-mode"]'),
    typewriterToggle: document.getElementById("typewriter-toggle"),
    tooltipsToggle: document.getElementById("tooltips-toggle")
  };
  const modesContainer = document.getElementById("game-mode-toggle-container");
  const flagsContainer = document.getElementById("feature-flags-container");
  const errorPopup = document.getElementById("settings-error-popup");
  const resetButton = document.getElementById("reset-settings-button");

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
    return updateSetting(key, value)
      .then((updated) => {
        currentSettings = updated;
      })
      .catch((err) => {
        console.error("Failed to update setting", err);
        showErrorAndRevert(revert);
      });
  }

  function clearToggles(container) {
    container.querySelectorAll(".settings-item").forEach((el) => el.remove());
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

  const resetModal = createResetConfirmation(() => {
    currentSettings = resetSettings();
    applyInitialControlValues(controls, currentSettings);
    withViewTransition(() => {
      applyDisplayMode(currentSettings.displayMode);
    });
    applyMotionPreference(currentSettings.motionEffects);
    initTooltips();
    clearToggles(modesContainer);
    renderGameModeSwitches(modesContainer, gameModes, getCurrentSettings, handleUpdate);
    clearToggles(flagsContainer);
    renderFeatureFlagSwitches(
      flagsContainer,
      currentSettings.featureFlags,
      getCurrentSettings,
      handleUpdate
    );
  });

  resetButton?.addEventListener("click", () => {
    resetModal.open(resetButton);
  });
}

async function initializeSettingsPage() {
  try {
    const settings = await loadSettings();
    const gameModes = await loadNavigationItems();
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
