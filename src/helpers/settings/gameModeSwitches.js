import { ToggleSwitch } from "../../components/ToggleSwitch.js";
import { updateNavigationItemHidden } from "../gameModeUtils.js";
import { showSettingsError } from "../showSettingsError.js";
import { showSnackbar } from "../showSnackbar.js";

/**
 * Render game mode toggle switches within the settings page.
 *
 * @pseudocode
 * 1. Sort `gameModes` by `order`, warn on missing `name`, and create a toggle for each.
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
    const isChecked = Object.hasOwn(current.gameModes, mode.id)
      ? current.gameModes[mode.id]
      : !mode.isHidden;
    const label = mode.name ?? mode.id ?? "Unknown mode";
    if (!mode.name) {
      console.warn("Game mode missing name", mode);
    }
    const toggle = new ToggleSwitch(`${label} (${mode.category} - ${mode.order})`, {
      id: `mode-${mode.id}`,
      name: mode.id,
      checked: isChecked,
      ariaLabel: label
    });
    const { element: wrapper, input } = toggle;
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
      const updated = { ...getCurrentSettings().gameModes, [mode.id]: input.checked };
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
