import { ToggleSwitch } from "../../components/ToggleSwitch.js";
import { updateNavigationItemHidden } from "../gameModeUtils.js";
import { showSettingsError } from "../showSettingsError.js";
import { showSnackbar } from "../showSnackbar.js";

/**
 * Render game mode toggle switches within the settings page.
 *
 * @pseudocode
 * 1. Sort `gameModes` by `order`, warn on missing `name`, skip malformed entries, create a toggle for each, and attach debug data attributes.
 * 2. When toggled, update navigation visibility via `updateNavigationItemHidden`.
 * 3. Persist the updated `gameModes` setting using `handleUpdate`.
 * 4. Show a snackbar confirming the new mode state.
 *
 * @param {HTMLElement} container - Target container for switches.
 * @param {Array} gameModes - List of mode definitions.
 * @param {Function} getCurrentSettings - Returns the current settings.
 * @param {Function} handleUpdate - Persist function.
 */
export function renderGameModeSwitches(container, gameModes, getCurrentSettings, handleUpdate) {
  if (!container || !Array.isArray(gameModes)) return;
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
    const toggle = new ToggleSwitch(label, {
      id: `mode-${mode.id}`,
      name: mode.id,
      checked: isChecked
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
    input.addEventListener("change", () => {
      const prev = !input.checked;
      const updated = {
        ...(getCurrentSettings().gameModes ?? {}),
        [mode.id]: input.checked
      };
      Promise.resolve(
        handleUpdate("gameModes", updated, () => {
          input.checked = prev;
        })
      ).then(() => {
        showSnackbar(`${label} ${input.checked ? "enabled" : "disabled"}`);
      });
      updateNavigationItemHidden(mode.id, !input.checked).catch((err) => {
        console.error("Failed to update navigation item", err);
        input.checked = prev;
        showSettingsError();
      });
    });
  });
}
