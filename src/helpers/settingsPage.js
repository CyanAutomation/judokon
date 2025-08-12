/**
 * Set up the Settings page once the document is ready.
 *
 * @pseudocode
 * 1. Fetch feature flags, game modes, and tooltips via `loadSettingsData`.
 * 2. Render page controls with `renderSettingsControls`.
 * 3. Show an error message if initialization fails.
 */
import { resetSettings } from "./settingsStorage.js";
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
import { initFeatureFlags, isEnabled } from "./featureFlags.js";

import { applyInitialControlValues } from "./settings/applyInitialValues.js";
import { attachToggleListeners } from "./settings/listenerUtils.js";
import { renderGameModeSwitches } from "./settings/gameModeSwitches.js";
import { renderFeatureFlagSwitches } from "./settings/featureFlagSwitches.js";
import { makeHandleUpdate } from "./settings/makeHandleUpdate.js";
import { addNavResetButton } from "./settings/addNavResetButton.js";

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
  cancel.addEventListener("click", () => modal.close());
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
 * 2. Query DOM elements for each control and container.
 * 3. Provide helpers to read/persist settings and show errors.
 * 4. Attach listeners for existing controls.
 * 5. Return `renderSwitches` to inject game-mode/feature-flag toggles and apply initial values later.
 *
 * @param {Settings} settings - Current settings object.
 * @returns {{ renderSwitches(gameModes: Array, tooltipMap: object): void }} Control API.
 */
function initializeControls(settings) {
  let currentSettings = { ...settings };
  let latestGameModes = [];
  let latestTooltipMap = {};

  const { controls, errorPopup, resetButton } = createControlsRefs();
  const getCurrentSettings = () => currentSettings;

  const showErrorAndRevert = makeErrorPopupHandler(errorPopup);
  const handleUpdate = makeHandleUpdate(
    (updated) => (currentSettings = updated),
    showErrorAndRevert
  );

  // Initial control values are applied when `renderSwitches` executes.
  attachToggleListeners(controls, getCurrentSettings, handleUpdate);

  const renderSwitches = makeRenderSwitches(controls, () => currentSettings, handleUpdate);

  const resetModal = createResetConfirmation(() => {
    currentSettings = resetSettings();
    withViewTransition(() => {
      applyDisplayMode(currentSettings.displayMode);
    });
    applyMotionPreference(currentSettings.motionEffects);
    toggleViewportSimulation(isEnabled("viewportSimulation"));
    toggleTooltipOverlayDebug(isEnabled("tooltipOverlayDebug"));
    toggleLayoutDebugPanel(isEnabled("layoutDebugPanel"));
    renderSwitches(latestGameModes, latestTooltipMap);
    expandAllSections();
  });

  resetButton?.addEventListener("click", () => {
    resetModal.open(resetButton);
  });

  return {
    renderSwitches: (gameModes, tooltipMap) => {
      latestGameModes = Array.isArray(gameModes) ? gameModes : [];
      latestTooltipMap = tooltipMap;
      renderSwitches(gameModes, tooltipMap);
    }
  };
}

function createControlsRefs() {
  const controls = {
    soundToggle: document.getElementById("sound-toggle"),
    motionToggle: document.getElementById("motion-toggle"),
    displayRadios: document.querySelectorAll('input[name="display-mode"]'),
    typewriterToggle: document.getElementById("typewriter-toggle"),
    tooltipsToggle: document.getElementById("tooltips-toggle"),
    cardOfTheDayToggle: document.getElementById("card-of-the-day-toggle"),
    fullNavigationMapToggle: document.getElementById("full-navigation-map-toggle")
  };
  return {
    controls,
    errorPopup: document.getElementById("settings-error-popup"),
    resetButton: document.getElementById("reset-settings-button")
  };
}

function makeErrorPopupHandler(errorPopup) {
  return function showErrorAndRevert(revert) {
    if (typeof revert === "function") revert();
    if (errorPopup) {
      errorPopup.textContent = "Failed to update settings. Please try again.";
      errorPopup.style.display = "block";
      setTimeout(() => {
        errorPopup.style.display = "none";
        errorPopup.textContent = "";
      }, 3000);
    }
  };
}

function clearToggles(container) {
  container.querySelectorAll(".settings-item").forEach((el) => el.remove());
}

function makeRenderSwitches(controls, getCurrentSettings, handleUpdate) {
  return function renderSwitches(gameModes, tooltipMap) {
    // Apply current settings once toggles are available.
    const current = getCurrentSettings();
    const radio = document.querySelector('input[name="display-mode"]:checked');
    let next = current;
    if (radio && radio.value !== current.displayMode) {
      withViewTransition(() => applyDisplayMode(radio.value));
      handleUpdate("displayMode", radio.value, () => {});
      next = { ...current, displayMode: radio.value };
    }
    applyInitialControlValues(controls, next, tooltipMap);
    const modesContainerEl = document.getElementById("game-mode-toggle-container");
    if (modesContainerEl && Array.isArray(gameModes)) {
      clearToggles(modesContainerEl);
      renderGameModeSwitches(modesContainerEl, gameModes, getCurrentSettings, handleUpdate);
    }
    const flagsContainerEl = document.getElementById("feature-flags-container");
    if (flagsContainerEl) {
      clearToggles(flagsContainerEl);
      renderFeatureFlagSwitches(
        flagsContainerEl,
        current.featureFlags,
        getCurrentSettings,
        handleUpdate,
        tooltipMap
      );
    }
    queueMicrotask(addNavResetButton);
    document.getElementById("feature-nav-cache-reset-button")?.addEventListener("change", () => {
      setTimeout(addNavResetButton);
    });
    initTooltips();
  };
}

/**
 * Ensure all settings sections are expanded.
 *
 * @pseudocode
 * 1. Remove the `hidden` attribute from each `.settings-section-content`.
 * 2. Set `aria-expanded` to `true` on every `.settings-section-toggle`.
 */
function expandAllSections() {
  document.querySelectorAll(".settings-section-content").forEach((el) => {
    el.removeAttribute("hidden");
  });
  document.querySelectorAll(".settings-section-toggle").forEach((btn) => {
    btn.setAttribute("aria-expanded", "true");
  });
}

/**
 * Fetch settings, game modes, and tooltips in parallel.
 *
 * @pseudocode
 * 1. Start requests for feature flags, navigation items, and tooltips.
 * 2. Await all requests with `Promise.all`.
 * 3. Return a tuple of `[settings, gameModes, tooltipMap]`.
 *
 * @returns {Promise<[Settings, Array, object]>} Loaded data tuple.
 */
export async function loadSettingsData() {
  const [settings, gameModes, tooltipMap] = await Promise.all([
    initFeatureFlags(),
    loadNavigationItems(),
    getTooltips()
  ]);
  return [settings, gameModes, tooltipMap];
}

/**
 * Render controls for the Settings page using fetched data.
 *
 * @pseudocode
 * 1. Sections render expanded by default.
 * 2. Apply initial display, motion, and feature settings.
 * 3. Initialize controls and render switches using provided data.
 * 4. Return the updated `document.body` for inspection.
 *
 * @param {Settings} settings - Current settings.
 * @param {Array} gameModes - List of available game modes.
 * @param {object} tooltipMap - Map of tooltip text.
 * @returns {HTMLElement} Updated DOM root.
 */
export function renderSettingsControls(settings, gameModes, tooltipMap) {
  expandAllSections();
  applyInitialSettings(settings);
  const controlsApi = initializeControls(settings);
  controlsApi.renderSwitches(gameModes, tooltipMap);
  return document.body;
}

/**
 * Load data then render Settings controls.
 *
 * @pseudocode
 * 1. Await `loadSettingsData` for required data.
 * 2. Pass data to `renderSettingsControls`.
 * 3. On error, show a fallback message to the user.
 *
 * @returns {Promise<void>}
 */
async function initializeSettingsPage() {
  try {
    const [settings, gameModes, tooltipMap] = await loadSettingsData();
    renderSettingsControls(settings, gameModes, tooltipMap);
  } catch (error) {
    console.error("Error loading settings page:", error);
    showLoadSettingsError();
  }
}

function applyInitialSettings(settings) {
  applyDisplayMode(settings.displayMode);
  applyMotionPreference(settings.motionEffects);
  toggleViewportSimulation(isEnabled("viewportSimulation"));
  toggleTooltipOverlayDebug(isEnabled("tooltipOverlayDebug"));
  toggleLayoutDebugPanel(isEnabled("layoutDebugPanel"));
}

function showLoadSettingsError() {
  const errorPopup = document.getElementById("settings-error-popup");
  if (errorPopup) {
    errorPopup.textContent = "Failed to load settings. Please refresh the page.";
    errorPopup.style.display = "block";
  }
  showSettingsError();
}

onDomReady(initializeSettingsPage);
