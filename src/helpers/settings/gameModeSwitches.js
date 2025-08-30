import { ToggleSwitch } from "../../components/ToggleSwitch.js";
import { updateNavigationItemHidden } from "../gameModeUtils.js";
import { showSettingsError } from "../showSettingsError.js";
import { showSnackbar } from "../showSnackbar.js";
import { navTooltipKey } from "../navigation/navigationService.js";

/**
 * Handle a game mode toggle change.
 *
 * @pseudocode
 * 1. Create a copy of current game mode settings with the updated value.
 * 2. Persist the change via `handleUpdate`; on failure revert the checkbox.
 * 3. Update navigation visibility via `updateNavigationItemHidden`.
 * 4. Show a snackbar when the setting is saved.
 *
 * @param {{
 *   input: HTMLInputElement,
 *   mode: object,
 *   label: string,
 *   getCurrentSettings: Function,
 *   handleUpdate: Function
 * }} params - Handler dependencies.
 * @returns {Promise<Array>} Resolves when persistence and navigation update complete.
 */
export function handleGameModeChange({ input, mode, label, getCurrentSettings, handleUpdate }) {
  const prev = !input.checked;
  const updated = {
    ...(getCurrentSettings().gameModes ?? {}),
    [mode.id]: input.checked
  };

  const updatePromise = Promise.resolve(
    handleUpdate("gameModes", updated, () => {
      input.checked = prev;
    })
  )
    .then(() => {
      showSnackbar(`${label} ${input.checked ? "enabled" : "disabled"}`);
    })
    .catch(() => {});

  const navPromise = updateNavigationItemHidden(mode.id, !input.checked).catch((err) => {
    console.error("Failed to update navigation item", err);
    input.checked = prev;
    showSettingsError();
  });

  return Promise.all([updatePromise, navPromise]);
}

/**
 * Render game mode toggle switches within the settings page.
 *
 * @pseudocode
 * 1. If `container` is missing or `gameModes` is not an array, warn and exit.
 * 2. Sort `gameModes` by `order`, warn on missing `name`, skip malformed entries, create a toggle for each with a tooltip id, and attach debug data attributes.
 * 3. When toggled, update navigation visibility via `updateNavigationItemHidden`.
 * 4. Persist the updated `gameModes` setting using `handleUpdate`.
 * 5. Show a snackbar confirming the new mode state.
 *
 * @param {HTMLElement} container - Target container for switches.
 * @param {Array} gameModes - List of mode definitions.
 * @param {Function} getCurrentSettings - Returns the current settings.
 * @param {Function} handleUpdate - Persist function.
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
export function renderGameModeSwitches(container, gameModes, getCurrentSettings, handleUpdate) {
  if (!container || !Array.isArray(gameModes)) {
    console.warn("renderGameModeSwitches: invalid container or gameModes", {
      container,
      gameModes
    });
    return;
  }
  const sortedModes = [...gameModes].sort((a, b) => a.order - b.order);
  sortedModes.forEach((mode) => {
    const current = getCurrentSettings();
    const currentModes = current.gameModes ?? {};
    const isChecked = Object.hasOwn(currentModes, mode.id) ? currentModes[mode.id] : !mode.isHidden;
    let label = mode.name;
    if (!mode.name) {
      console.warn("Game mode missing name", mode);
      if (!mode.id) {
        console.warn("Skipping malformed game mode", mode);
        return;
      }
      label = mode.id;
    }
    const tooltipId = `nav.${navTooltipKey(label)}`;
    const toggle = new ToggleSwitch(label, {
      id: `mode-${mode.id}`,
      name: mode.id,
      checked: isChecked,
      tooltipId
    });
    const { element: wrapper, input } = toggle;
    if (mode.category) wrapper.dataset.category = mode.category;
    if (typeof mode.order !== "undefined") wrapper.dataset.order = String(mode.order);
    if (mode.description) {
      const desc = document.createElement("p");
      desc.className = "settings-description";
      desc.id = `mode-${mode.id}-desc`;
      desc.textContent = mode.description;
      wrapper.appendChild(desc);
      if (input) input.setAttribute("aria-describedby", desc.id);
    }
    container.appendChild(wrapper);
    if (!input) return;
    input.addEventListener("change", () =>
      handleGameModeChange({
        input,
        mode,
        label,
        getCurrentSettings,
        handleUpdate
      })
    );
  });
}
