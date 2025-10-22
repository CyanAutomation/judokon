/**
 * Set up the Settings page once the document is ready.
 *
 * @pseudocode
 * 1. Fetch feature flags, game modes, and tooltips via `fetchSettingsData`.
 * 2. Render page controls with `renderSettingsControls`.
 * 3. Show an error message if initialization fails.
 */
import { resetSettings } from "./settingsStorage.js";
import { loadGameModes } from "./gameModeUtils.js";
import { showSettingsError } from "./showSettingsError.js";
import { applyDisplayMode } from "./displayMode.js";
import { withViewTransition } from "./viewTransition.js";
import { applyMotionPreference } from "./motionUtils.js";
import { onDomReady } from "./domReady.js";
import { initTooltips, getTooltips } from "./tooltip.js";
import { toggleTooltipOverlayDebug } from "./tooltipOverlayDebug.js";
import { toggleLayoutDebugPanel } from "./layoutDebugPanel.js";
import { initFeatureFlags, isEnabled } from "./featureFlags.js";
import { showSnackbar } from "./showSnackbar.js";

import { applyInitialControlValues } from "./settings/applyInitialValues.js";
import { attachToggleListeners } from "./settings/listenerUtils.js";
import { makeHandleUpdate } from "./settings/makeHandleUpdate.js";
import { createResetModal } from "./settings/createResetModal.js";
import { attachResetListener } from "./settings/attachResetListener.js";
import { syncDisplayMode } from "./settings/syncDisplayMode.js";
import { renderGameModes } from "./settings/renderGameModes.js";
import { renderFeatureFlags } from "./settings/renderFeatureFlags.js";
import { setupAdvancedSettingsSearch } from "./settings/filterAdvancedSettings.js";

/**
 * Helper: create and return refs for settings controls and containers.
 *
 * @pseudocode
 * 1. Query the DOM for known control elements (toggles, radios, reset button).
 * 2. Return an object with `controls`, `errorPopup`, and `resetButton` refs.
 * 3. Keep this function minimal and DOM-only so it is easy to unit test.
 */
/**
 * Page-ready lifecycle: initialize and render settings when the DOM is ready.
 *
 * @pseudocode
 * 1. Fetch feature flags, game modes, and tooltips via `fetchSettingsData()`.
 * 2. Call `renderWithFallbacks` with the loaded data to render the UI.
 * 3. If loading fails, show a visible error message and surface a fallback.
 */
/**
 * Expose a small testing hook that resolves when the settings UI is ready.
 *
 * @pseudocode
 * 1. Create `settingsReadyPromise` resolved when `settings:ready` is dispatched.
 * 2. Attach it to `window` so tests can await it.
 */
const hasDocument = typeof document !== "undefined";

/**
 * Promise that resolves once the Settings UI dispatches `settings:ready`.
 *
 * @summary Provides a synchronization point for scripts/tests awaiting the
 * Settings page to finish rendering. Falls back to an already-resolved promise
 * when no DOM is present, keeping server-side imports side-effect free.
 *
 * @pseudocode
 * 1. Detect whether `document` is available via `hasDocument`.
 * 2. If available, create a new `Promise` and attach a one-time `settings:ready`
 *    listener that resolves it.
 * 3. If not available, return `Promise.resolve()` so consumers can still await readiness.
 *
 * @type {Promise<void>}
 */
export const settingsReadyPromise = hasDocument
  ? new Promise((resolve) => {
      document.addEventListener("settings:ready", resolve, { once: true });
    })
  : Promise.resolve();

// Expose readiness for tests to await in browser environments.
if (typeof window !== "undefined") {
  window.settingsReadyPromise = settingsReadyPromise;
}

let errorPopupTimeoutId;

/**
 * Initialize controls and event wiring for the Settings page.
 *
 * @pseudocode
 * 1. Store a mutable copy of `settings` for updates.
 * 2. Query DOM elements for each control and container.
 * 3. Provide helpers to read/persist settings and show errors.
 * 4. Build a reset modal and attach the Restore Defaults listener once.
 *    - Reset confirms, reloads feature flags, reapplies defaults, and rerenders switches.
 * 5. Return `renderSwitches` callback for injecting game-mode/feature-flag toggles later.
 *
 * @param {Settings} settings - Current settings object.
 * @returns {(gameModes: Array, tooltipMap: object) => void} Render helper.
 */
function initializeControls(settings) {
  let currentSettings = { ...settings };
  let latestGameModes = [];
  let latestTooltipMap = {};

  const { controls, errorPopup, resetButton } = createControlsRefs();
  const getCurrentSettings = () => currentSettings;

  const showErrorAndRevert = makeErrorPopupHandler(errorPopup);
  const onUpdate = (controlElement) => {
    const settingItem = controlElement.closest(".settings-item");
    if (settingItem) {
      settingItem.classList.add("saved");
      setTimeout(() => {
        settingItem.classList.remove("saved");
      }, 2000);
    }
  };

  const handleUpdate = makeHandleUpdate(
    (updated) => (currentSettings = updated),
    showErrorAndRevert,
    onUpdate
  );

  // Initial control values are applied when `renderSwitches` executes.
  attachToggleListeners(controls, getCurrentSettings, handleUpdate);

  const renderSwitches = makeRenderSwitches(controls, () => currentSettings, handleUpdate);

  const resetModal = createResetModal(async () => {
    resetSettings();
    currentSettings = await initFeatureFlags();
    withViewTransition(() => {
      applyDisplayMode(currentSettings.displayMode);
    });
    applyMotionPreference(currentSettings.motionEffects);
    toggleTooltipOverlayDebug(isEnabled("tooltipOverlayDebug"));
    toggleLayoutDebugPanel(isEnabled("layoutDebugPanel"));
    renderSwitches(latestGameModes, latestTooltipMap);
    expandAllSections();
    showSnackbar("Settings restored to defaults");
  });

  attachResetListener(resetButton, resetModal);

  return (gameModes, tooltipMap) => {
    latestGameModes = Array.isArray(gameModes) ? gameModes : [];
    latestTooltipMap = tooltipMap;
    renderSwitches(gameModes, tooltipMap);
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
      if (errorPopupTimeoutId) clearTimeout(errorPopupTimeoutId);
      errorPopupTimeoutId = setTimeout(() => {
        errorPopup.style.display = "none";
        errorPopup.textContent = "";
        errorPopupTimeoutId = undefined;
      }, 3000);
    }
  };
}

function makeRenderSwitches(controls, getCurrentSettings, handleUpdate) {
  let cleanupTooltips;
  return function renderSwitches(gameModes, tooltipMap) {
    if (cleanupTooltips) {
      cleanupTooltips();
      cleanupTooltips = undefined;
    }
    const current = getCurrentSettings();
    applyInitialControlValues(controls, current, tooltipMap);
    const next = syncDisplayMode(current, handleUpdate);
    renderGameModes(gameModes, getCurrentSettings, handleUpdate);
    renderFeatureFlags(next, getCurrentSettings, handleUpdate, tooltipMap);
    initTooltips().then((fn) => {
      cleanupTooltips = fn;
    });
  };
}

/**
 * Fetch settings, game modes, and tooltips with unified error handling.
 *
 * @pseudocode
 * 1. Request feature flags, navigation items, and tooltips in parallel.
 * 2. Await all requests; on failure throw a wrapped error.
 * 3. Return an object `{ settings, gameModes, tooltipMap }`.
 *
 * @returns {Promise<{settings: Settings, gameModes: Array, tooltipMap: object}>}
 *   Loaded data object.
 */
export async function fetchSettingsData() {
  try {
    const [settings, gameModes, tooltipMap] = await Promise.all([
      initFeatureFlags(),
      loadGameModes(),
      getTooltips()
    ]);
    return { settings, gameModes, tooltipMap };
  } catch (error) {
    throw new Error("Failed to fetch settings data", { cause: error });
  }
}

/**
 * Render controls for the Settings page using fetched data.
 *
 * @pseudocode
 * 1. Sections render expanded by default.
 * 2. Apply initial display, motion, and feature settings.
 * 3. Initialize controls and render switches using provided data.
 * 4. Emit a `settings:ready` event.
 * 5. Return the updated `document.body` for inspection.
 *
 * @param {Settings} settings - Current settings.
 * @param {Array} gameModes - List of available game modes.
 * @param {object} tooltipMap - Map of tooltip text.
 * @returns {HTMLElement} Updated DOM root.
 */
export function renderSettingsControls(settings, gameModes, tooltipMap) {
  applyInitialSettings(settings);
  const renderSwitches = initializeControls(settings);
  renderSwitches(gameModes, tooltipMap);
  setupCollapsibleSections();
  document.dispatchEvent(new Event("settings:ready"));
  return document.body;
}

/**
 * Show an error message in a specific settings section.
 *
 * @param {string} containerId - The ID of the container to show the error in.
 * @param {string} message - The error message to display.
 */
function showSectionError(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.textContent = "";
    const errorEl = document.createElement("div");
    errorEl.className = "settings-section-error";
    errorEl.setAttribute("role", "alert");
    errorEl.setAttribute("aria-live", "assertive");
    errorEl.textContent = message;
    container.append(errorEl);
  }
}

/**
 * Render settings with section-level fallbacks.
 *
 * @pseudocode
 * 1. If `settings` is absent, return early.
 * 2. When `gameModes` is empty, show an error in the Game Modes section.
 * 3. When `settings.featureFlags` is missing, show an error in Advanced Settings.
 * 4. Invoke `renderSettingsControls` with provided data.
 *
 * @param {{settings: Settings, gameModes: Array, tooltipMap: object}} data
 *   Loaded settings data.
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
/**
 * Render settings UI and show section-level fallbacks when data is missing.
 *
 * @param {{settings: Settings, gameModes: Array, tooltipMap: object}} data - Loaded settings payload.
 * @returns {void}
 *
 * @pseudocode
 * 1. If `settings` is falsy, return early (nothing to render).
 * 2. If `gameModes` is not an Array or empty, show a Game Modes error message.
 * 3. If `settings.featureFlags` is missing, show Advanced Settings error.
 * 4. Call `renderSettingsControls(settings, gameModes || [], tooltipMap)`.
 */
export function renderWithFallbacks({ settings, gameModes, tooltipMap }) {
  if (!settings) return;
  if (!Array.isArray(gameModes) || gameModes.length === 0) {
    showSectionError(
      "game-mode-toggle-container",
      "Game Modes could not be loaded. Please check your connection or try again later."
    );
  }
  if (!settings.featureFlags) {
    showSectionError(
      "feature-flags-container",
      "Advanced Settings could not be loaded. Please check your connection or try again later."
    );
  }
  renderSettingsControls(settings, Array.isArray(gameModes) ? gameModes : [], tooltipMap);
}

/**
 * Load data then render Settings controls.
 *
 * @pseudocode
 * 1. Await `fetchSettingsData`; on failure show load error and return.
 * 2. Pass the resolved data to `renderWithFallbacks`.
 *
 * @returns {Promise<void>}
 */
async function initializeSettingsPage() {
  let data;
  try {
    data = await fetchSettingsData();
  } catch (error) {
    console.error("Error loading settings page:", error);
    showLoadSettingsError();
    return;
  }
  renderWithFallbacks(data);

  if (typeof window !== "undefined") {
    const searchInput = document.getElementById("advanced-settings-search");
    const flagsContainer = document.getElementById("feature-flags-container");
    const emptyStateNode = document.getElementById("advanced-settings-no-results");
    const statusNode = document.getElementById("advanced-settings-search-status");
    setupAdvancedSettingsSearch({
      input: searchInput,
      container: flagsContainer,
      emptyStateNode,
      statusNode
    });
  }
}

function applyInitialSettings(settings) {
  applyDisplayMode(settings.displayMode);
  applyMotionPreference(settings.motionEffects);
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
/**
 * Re-exports the game-mode toggle handler used by the Settings UI.
 *
 * @summary This provides a stable import surface for the Settings page and
 * for tests that need to directly call the handler for game mode changes.
 *
 * @description
 * The actual implementation of `handleGameModeChange` resides in
 * `./settings/gameModeSwitches.js`. This re-export ensures that consumers
 * can import this function consistently without needing to know its exact
 * internal location.
 *
 * @pseudocode
 * 1. The `handleGameModeChange` function is imported from `./settings/gameModeSwitches.js`.
 * 2. It is then re-exported from this module, making it available to other parts of the application.
 * 3. Consumers can attach this function as an event listener to UI controls that modify game mode settings.
 *
 * @returns {void}
 */
export { handleGameModeChange } from "./settings/gameModeSwitches.js";

/**
 * Re-exports the feature-flag toggle handler used by the Settings UI.
 *
 * @summary This provides a stable import surface for the Settings page and
 * for tests that need to directly call the handler for feature flag changes.
 *
 * @description
 * The actual logic for applying and validating feature-flag toggles is
 * implemented in `./settings/featureFlagSwitches.js`. This re-export allows
 * other modules and tests to reuse the same handler implementation.
 *
 * @pseudocode
 * 1. The `handleFeatureFlagChange` function is imported from `./settings/featureFlagSwitches.js`.
 * 2. It is then re-exported from this module, making it available to other parts of the application.
 * 3. Consumers can attach this function as an event listener to UI controls that modify feature flag settings.
 *
 * @returns {void}
 */
export { handleFeatureFlagChange } from "./settings/featureFlagSwitches.js";
