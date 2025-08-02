/**
 * Set up the Settings page once the document is ready.
 *
 * @pseudocode
 * 1. Load saved settings and available navigation items.
 * 2. Apply the stored display mode and motion preference.
 * 3. Toggle the `.simulate-viewport` class based on the viewport flag.
 * 4. Initialize the page controls and event listeners.
 */
import { loadSettings, updateSetting, resetSettings } from "./settingsUtils.js";
import { loadNavigationItems } from "./gameModeUtils.js";
import { showSettingsError } from "./showSettingsError.js";
import { applyDisplayMode } from "./displayMode.js";
import { withViewTransition } from "./viewTransition.js";
import { applyMotionPreference } from "./motionUtils.js";
import { onDomReady } from "./domReady.js";
import { initTooltips, getTooltips } from "./tooltip.js";
import { createModal } from "../components/Modal.js";
import { createButton } from "../components/Button.js";
import { toggleViewportSimulation } from "./viewportDebug.js";
import { toggleTooltipOverlayDebug } from "./tooltipOverlayDebug.js";
import { toggleLayoutDebugPanel } from "./layoutDebugPanel.js";
import { populateNavbar } from "./navigationBar.js";
import { showSnackbar } from "./showSnackbar.js";

import { applyInitialControlValues } from "./settings/applyInitialValues.js";
import { attachToggleListeners } from "./settings/listenerUtils.js";
import { renderGameModeSwitches } from "./settings/gameModeSwitches.js";
import { renderFeatureFlagSwitches } from "./settings/featureFlagSwitches.js";
import { setupSectionToggles } from "./settings/sectionToggle.js";

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
 * 4. Apply initial values, attach listeners, and render mode and flag switches.
 * 5. When `navCacheResetButton` is enabled, queue a microtask to append a
 *    button that clears cached navigation data and refreshes the navbar.
 *
 * @param {Settings} settings - Current settings object.
 * @param {Array} gameModes - Available game mode options.
 */
function initializeControls(settings, gameModes, tooltipMap) {
  let currentSettings = { ...settings };

  const controls = {
    soundToggle: document.getElementById("sound-toggle"),
    motionToggle: document.getElementById("motion-toggle"),
    displayRadios: document.querySelectorAll('input[name="display-mode"]'),
    typewriterToggle: document.getElementById("typewriter-toggle"),
    tooltipsToggle: document.getElementById("tooltips-toggle"),
    cardOfTheDayToggle: document.getElementById("card-of-the-day-toggle"),
    fullNavigationMapToggle: document.getElementById("full-navigation-map-toggle")
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

  function addNavResetButton() {
    const section = document.getElementById("advanced-settings-content");
    const existing = document.getElementById("nav-cache-reset-button");
    existing?.parentElement?.remove();
    if (!section) return;
    if (!currentSettings.featureFlags.navCacheResetButton?.enabled) return;
    const wrapper = document.createElement("div");
    wrapper.className = "settings-item";
    const btn = createButton("Reset Navigation Cache", {
      id: "nav-cache-reset-button"
    });
    wrapper.appendChild(btn);
    section.appendChild(wrapper);
    btn.addEventListener("click", () => {
      localStorage.removeItem("navigationItems");
      populateNavbar();
      showSnackbar("Navigation cache cleared");
    });
  }

  applyInitialControlValues(controls, currentSettings, tooltipMap);
  attachToggleListeners(controls, getCurrentSettings, handleUpdate);
  renderGameModeSwitches(modesContainer, gameModes, getCurrentSettings, handleUpdate);
  renderFeatureFlagSwitches(
    flagsContainer,
    currentSettings.featureFlags,
    getCurrentSettings,
    handleUpdate,
    tooltipMap
  );
  // Queue to ensure the section exists before inserting
  queueMicrotask(addNavResetButton);
  document.getElementById("feature-nav-cache-reset-button")?.addEventListener("change", () => {
    setTimeout(addNavResetButton);
  });

  const resetModal = createResetConfirmation(() => {
    currentSettings = resetSettings();
    applyInitialControlValues(controls, currentSettings, tooltipMap);
    withViewTransition(() => {
      applyDisplayMode(currentSettings.displayMode);
    });
    applyMotionPreference(currentSettings.motionEffects);
    toggleViewportSimulation(Boolean(currentSettings.featureFlags.viewportSimulation?.enabled));
    toggleTooltipOverlayDebug(Boolean(currentSettings.featureFlags.tooltipOverlayDebug?.enabled));
    toggleLayoutDebugPanel(Boolean(currentSettings.featureFlags.layoutDebugPanel?.enabled));
    clearToggles(modesContainer);
    renderGameModeSwitches(modesContainer, gameModes, getCurrentSettings, handleUpdate);
    clearToggles(flagsContainer);
    renderFeatureFlagSwitches(
      flagsContainer,
      currentSettings.featureFlags,
      getCurrentSettings,
      handleUpdate,
      tooltipMap
    );
    queueMicrotask(addNavResetButton);
    setupSectionToggles();
    initTooltips();
    document.getElementById("feature-nav-cache-reset-button")?.addEventListener("change", () => {
      setTimeout(addNavResetButton);
    });
  });

  resetButton?.addEventListener("click", () => {
    resetModal.open(resetButton);
  });
}

/**
 * Load saved settings and render the Settings page UI.
 *
 * @pseudocode
 * 1. Call `setupSectionToggles` so collapsible sections work immediately.
 * 2. Fetch settings, navigation items, and tooltip text.
 * 3. Apply display and motion preferences from the settings.
 * 4. Enable debug utilities based on feature flags.
 * 5. Initialize page controls and section toggles.
 * 6. Set up tooltips for all controls.
 * 7. On error, show a fallback message to the user.
 *
 * @returns {Promise<void>}
 */
async function initializeSettingsPage() {
  try {
    setupSectionToggles();
    const settings = await loadSettings();
    const gameModes = await loadNavigationItems();
    const tooltipMap = await getTooltips();
    applyDisplayMode(settings.displayMode);
    applyMotionPreference(settings.motionEffects);
    toggleViewportSimulation(Boolean(settings.featureFlags.viewportSimulation?.enabled));
    toggleTooltipOverlayDebug(Boolean(settings.featureFlags.tooltipOverlayDebug?.enabled));
    toggleLayoutDebugPanel(Boolean(settings.featureFlags.layoutDebugPanel?.enabled));
    initializeControls(settings, gameModes, tooltipMap);
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
