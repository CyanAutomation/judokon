import { ToggleSwitch } from "../../components/ToggleSwitch.js";
import navigationItems from "../../data/navigationItems.js";
import { updateNavigationItemHidden } from "../gameModeUtils.js";
import { showSettingsError } from "../showSettingsError.js";
import { showSnackbar } from "../showSnackbar.js";

const NAVIGATION_ENABLED_MODE_IDS = new Set(
  navigationItems.map((item) => item.gameModeId).filter((id) => typeof id === "number")
);

/**
 * Resolve a mode ID to a valid navigation mode ID.
 *
 * @pseudocode
 * 1. Validate numeric IDs directly against the navigable set.
 * 2. Parse string IDs as integers when possible.
 * 3. Ensure the parsed number is a safe integer before lookup.
 * 4. Return the resolved ID or null when not navigable.
 *
 * @param {string|number} modeId - The mode identifier to resolve.
 * @returns {number|null} The resolved navigation mode ID or null if not navigable.
 */
function resolveNavigationModeId(modeId) {
  if (typeof modeId === "number") {
    if (Number.isSafeInteger(modeId) && NAVIGATION_ENABLED_MODE_IDS.has(modeId)) {
      return modeId;
    }
    return null;
  }

  if (typeof modeId === "string") {
    const parsed = Number.parseInt(modeId, 10);
    if (Number.isSafeInteger(parsed) && NAVIGATION_ENABLED_MODE_IDS.has(parsed)) {
      return parsed;
    }
  }

  return null;
}

/**
 * Handle a game mode toggle change.
 *
 * @pseudocode
 * 1. Create a copy of current game mode settings with the updated value.
 * 2. Persist the change via `handleUpdate`; on failure revert the checkbox.
 * 3. When persistence succeeds, update navigation visibility via `updateNavigationItemHidden`.
 * 4. Revert and surface an error if the navigation update fails.
 * 5. Show a snackbar when the setting is saved.
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
  const nextChecked = input.checked;
  const prev = !nextChecked;
  const revert = () => {
    input.checked = prev;
  };
  const updated = {
    ...(getCurrentSettings().gameModes ?? {}),
    [mode.id]: nextChecked
  };

  const navigationModeId = resolveNavigationModeId(mode.id);

  const updatePromise = Promise.resolve(handleUpdate("gameModes", updated, revert, input))
    .then(() => {
      showSnackbar(`${label} ${nextChecked ? "enabled" : "disabled"}`);
      return { success: true };
    })
    .catch((error) => {
      console.error("Failed to persist game mode setting:", error);
      return { success: false, error };
    });

  const navPromise =
    navigationModeId === null
      ? Promise.resolve()
      : updatePromise.then((result) => {
          if (!result?.success) {
            return;
          }

          return Promise.resolve(updateNavigationItemHidden(navigationModeId, !nextChecked)).catch(
            (err) => {
              console.error("Failed to update navigation item", err);
              revert();
              showSettingsError();
              throw err;
            }
          );
        });

  return Promise.all([updatePromise, navPromise]);
}

/**
 * Render game mode toggle switches within the settings page.
 *
 * @description
 * Create a ToggleSwitch for each provided game mode that has a corresponding
 * navigation entry and wire change handlers to persist updates and update
 * navigation visibility.
 *
 * @pseudocode
 * 1. Validate `container` and `gameModes` input; return early when invalid.
 * 2. Sort `gameModes` by `order` and iterate each entry that resolves to a
 *    navigation mode.
 * 3. For each mode:
 *    a. Build a `ToggleSwitch` with proper label, tooltip, and accessibility attributes.
 *    b. Append description text when available and set `aria-describedby`.
 *    c. Attach a `change` listener that calls `handleGameModeChange`.
 * 4. Leave existing DOM structure intact when possible and avoid throwing.
 *
 * @param {HTMLElement} container - DOM element that will receive toggle controls.
 * @param {Array<Object>} gameModes - Array of game-mode objects (id, name, order, description, isHidden, category).
 * @param {() => Object} getCurrentSettings - Function that returns the current settings object.
 * @param {(key: string, value: any, onError?: Function) => Promise} handleUpdate - Function to persist setting updates.
 * @returns {void}
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
    if (resolveNavigationModeId(mode.id) === null) {
      return;
    }
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
    const fallbackTooltipId = (() => {
      if (typeof mode.id === "string") {
        const trimmedId = mode.id.trim();
        return trimmedId.length > 0 ? `mode.${trimmedId}` : undefined;
      }

      if (typeof mode.id === "number" && Number.isFinite(mode.id)) {
        return `mode.${mode.id}`;
      }

      return undefined;
    })();

    const tooltipId =
      typeof mode.tooltipId === "string" && mode.tooltipId.length > 0
        ? mode.tooltipId
        : fallbackTooltipId;

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
