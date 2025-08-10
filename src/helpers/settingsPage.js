/**
 * Set up the Settings page once the document is ready.
 *
 * @pseudocode
 * 1. Load saved settings, navigation items, and tooltip text.
 * 2. Apply the stored display mode and motion preference.
 * 3. Toggle the `.simulate-viewport` class based on the viewport flag.
 * 4. Initialize the page controls and event listeners.
 */
import { loadSettings, resetSettings } from "./settingsStorage.js";
import { loadNavigationItems, loadGameModes } from "./gameModeUtils.js";
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
import { isEnabled } from "./featureFlags.js";

import { applyInitialControlValues } from "./settings/applyInitialValues.js";
import { attachToggleListeners } from "./settings/listenerUtils.js";
import { renderGameModeSwitches } from "./settings/gameModeSwitches.js";
import { renderFeatureFlagSwitches } from "./settings/featureFlagSwitches.js";
import { setupSectionToggles } from "./settings/sectionToggle.js";
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
    setupSectionToggles();
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
    applyInitialControlValues(controls, current, tooltipMap);
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
 * Render the Settings page with supplied data.
 *
 * @pseudocode
 * 1. Enable section toggles via `setupSectionToggles`.
 * 2. Apply initial display, motion, and feature settings.
 * 3. Initialize controls and render switches using provided data.
 * 4. Return the updated `document.body` for inspection.
 *
 * @param {Settings} settings - Current settings.
 * @param {Array} gameModes - List of available game modes.
 * @param {object} tooltipMap - Map of tooltip text.
 * @returns {HTMLElement} Updated DOM root.
 */
export function renderSettingsUI(settings, gameModes, tooltipMap) {
  setupSectionToggles();
  applyInitialSettings(settings);
  const controlsApi = initializeControls(settings);
  controlsApi.renderSwitches(gameModes, tooltipMap);
  return document.body;
}

/**
 * Load data and render the Settings page UI.
 *
 * @pseudocode
 * 1. Start loading navigation items and tooltips in parallel.
 * 2. Load saved settings.
 * 3. Resolve navigation items and tooltips with `Promise.all` on wrapped promises.
 * 4. Invoke `renderSettingsUI` with the retrieved data.
 * 5. On error, show a fallback message to the user.
 *
 * @returns {Promise<void>}
 */
async function initializeSettingsPage() {
  try {
    // Enable section toggles immediately so the UI is responsive
    // even if data loading is slow or fails.
    setupSectionToggles();
    const gameModesPromise = settled(loadNavigationItems());
    const tooltipMapPromise = settled(getTooltips());
    const settings = await loadSettings();
    const [gameModesResult, tooltipMapResult] = await Promise.all([
      gameModesPromise,
      tooltipMapPromise
    ]);
    const gameModes = await resolveGameModes(gameModesResult);
    const tooltipMap = resolveTooltipMap(tooltipMapResult);
    renderSettingsUI(settings, gameModes, tooltipMap);
  } catch (error) {
    console.error("Error loading settings page:", error);
    showLoadSettingsError();
  }
}

function settled(promise) {
  return promise.then(
    (v) => ({ status: "fulfilled", value: v }),
    (r) => ({ status: "rejected", reason: r })
  );
}

function applyInitialSettings(settings) {
  applyDisplayMode(settings.displayMode);
  applyMotionPreference(settings.motionEffects);
  toggleViewportSimulation(isEnabled("viewportSimulation"));
  toggleTooltipOverlayDebug(isEnabled("tooltipOverlayDebug"));
  toggleLayoutDebugPanel(isEnabled("layoutDebugPanel"));
}

async function resolveGameModes(result) {
  if (result.status === "fulfilled" && Array.isArray(result.value)) {
    return result.value;
  }
  console.warn(
    "Failed to load game modes",
    result.status === "fulfilled" ? result.value : result.reason
  );
  showSettingsError();
  try {
    const fallback = await loadGameModes();
    return Array.isArray(fallback) ? fallback : [];
  } catch (err) {
    console.error("Failed to load fallback game modes", err);
    return [];
  }
}

function resolveTooltipMap(result) {
  if (result.status === "fulfilled") return result.value;
  console.warn("Failed to load tooltips", result.reason);
  return {};
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
