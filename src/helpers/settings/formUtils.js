import { createToggleSwitch } from "../../components/ToggleSwitch.js";
import { applyDisplayMode } from "../displayMode.js";
import { withViewTransition } from "../viewTransition.js";
import { applyMotionPreference } from "../motionUtils.js";
import { updateNavigationItemHidden } from "../gameModeUtils.js";
import { showSettingsError } from "../showSettingsError.js";
import { showSnackbar } from "../showSnackbar.js";

/**
 * Apply a value to an input or checkbox element.
 *
 * @pseudocode
 * 1. Exit early when `element` is null or undefined.
 * 2. For checkboxes, set the `checked` property based on `value`.
 * 3. For other inputs, assign the `value` directly.
 *
 * @param {HTMLInputElement|HTMLSelectElement|null} element - Control to update.
 * @param {*} value - Value to apply.
 */
function applyInputState(element, value) {
  if (!element) return;
  if (element.type === "checkbox") {
    element.checked = Boolean(value);
  } else {
    element.value = value;
  }
}

/**
 * Initialize control states based on a settings object.
 *
 * @pseudocode
 * 1. Call `applyInputState` for each setting-related control.
 *
 * @param {Object} controls - Collection of form elements.
 * @param {import("../settingsUtils.js").Settings} settings - Current settings.
 */
export function applyInitialControlValues(controls, settings) {
  applyInputState(controls.soundToggle, settings.sound);
  applyInputState(controls.motionToggle, settings.motionEffects);
  if (controls.displayRadios) {
    controls.displayRadios.forEach((radio) => {
      const isSelected = radio.value === settings.displayMode;
      radio.checked = isSelected;
      radio.tabIndex = isSelected ? 0 : -1;
    });
  }
  applyInputState(controls.typewriterToggle, settings.typewriterEffect);
  applyInputState(controls.tooltipsToggle, settings.tooltips);
}

/**
 * Attach change listeners that persist settings updates.
 *
 * @pseudocode
 * 1. Listen for changes on each toggle or select element.
 * 2. Use `handleUpdate` to persist the new value, reverting if it fails.
 * 3. Apply side effects like `applyMotionPreference` and `applyDisplayMode`.
 * 4. After a successful update, show a snackbar confirming the change.
 *
 * @param {Object} controls - Form controls with DOM references.
 * @param {Function} getCurrentSettings - Returns the latest settings object.
 * @param {Function} handleUpdate - Persist function `(key,value,revert)=>void`.
 */
export function attachToggleListeners(controls, getCurrentSettings, handleUpdate) {
  const { soundToggle, motionToggle, displayRadios, typewriterToggle, tooltipsToggle } = controls;
  soundToggle?.addEventListener("change", () => {
    const prev = !soundToggle.checked;
    handleUpdate("sound", soundToggle.checked, () => {
      soundToggle.checked = prev;
    }).then(() => {
      showSnackbar(`Sound ${soundToggle.checked ? "enabled" : "disabled"}`);
    });
  });
  motionToggle?.addEventListener("change", () => {
    const prev = !motionToggle.checked;
    applyMotionPreference(motionToggle.checked);
    handleUpdate("motionEffects", motionToggle.checked, () => {
      motionToggle.checked = prev;
      applyMotionPreference(prev);
    }).then(() => {
      showSnackbar(`Motion effects ${motionToggle.checked ? "enabled" : "disabled"}`);
    });
  });
  if (displayRadios) {
    displayRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        if (!radio.checked) return;
        const previous = getCurrentSettings().displayMode;
        const mode = radio.value;
        displayRadios.forEach((r) => {
          r.tabIndex = r === radio ? 0 : -1;
        });
        withViewTransition(() => {
          applyDisplayMode(mode);
        });
        handleUpdate("displayMode", mode, () => {
          const prevRadio = Array.from(displayRadios).find((r) => r.value === previous);
          if (prevRadio) prevRadio.checked = true;
          displayRadios.forEach((r) => {
            r.tabIndex = r.value === previous ? 0 : -1;
          });
          withViewTransition(() => {
            applyDisplayMode(previous);
          });
        }).then(() => {
          const label = mode.charAt(0).toUpperCase() + mode.slice(1);
          showSnackbar(`${label} mode enabled`);
        });
      });
    });
  }
  typewriterToggle?.addEventListener("change", () => {
    const prev = !typewriterToggle.checked;
    handleUpdate("typewriterEffect", typewriterToggle.checked, () => {
      typewriterToggle.checked = prev;
    }).then(() => {
      showSnackbar(`Typewriter effect ${typewriterToggle.checked ? "enabled" : "disabled"}`);
    });
  });
  tooltipsToggle?.addEventListener("change", () => {
    const prev = !tooltipsToggle.checked;
    handleUpdate("tooltips", tooltipsToggle.checked, () => {
      tooltipsToggle.checked = prev;
    }).then(() => {
      showSnackbar(`Tooltips ${tooltipsToggle.checked ? "enabled" : "disabled"}`);
    });
  });
}

/**
 * Render game mode toggle switches within the settings page.
 *
 * @pseudocode
 * 1. Sort `gameModes` by `order` and create a toggle for each.
 * 2. When toggled, update navigation visibility via `updateNavigationItemHidden`.
 * 3. Persist the updated `gameModes` setting using `handleUpdate`.
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
    const wrapper = createToggleSwitch(`${mode.name} (${mode.category} - ${mode.order})`, {
      id: `mode-${mode.id}`,
      name: mode.id,
      checked: isChecked,
      ariaLabel: mode.name
    });
    if (mode.description) {
      const desc = document.createElement("p");
      desc.className = "settings-description";
      desc.textContent = mode.description;
      wrapper.appendChild(desc);
    }
    container.appendChild(wrapper);
    const input = wrapper.querySelector("input");
    input.addEventListener("change", () => {
      const prev = !input.checked;
      const updated = { ...getCurrentSettings().gameModes, [mode.id]: input.checked };
      handleUpdate("gameModes", updated, () => {
        input.checked = prev;
      });
      updateNavigationItemHidden(mode.id, !input.checked).catch((err) => {
        console.error("Failed to update navigation item", err);
        input.checked = prev;
        showSettingsError();
      });
    });
  });
}

/**
 * Render feature flag toggle switches.
 *
 * @pseudocode
 * 1. For each flag, generate a labelled toggle switch element and description.
 * 2. Persist updates via `handleUpdate` when toggled.
 *
 * @param {HTMLElement} container - Container for the switches.
 * @param {Record<string, { enabled: boolean, label: string, description: string }>} flags - Feature flag metadata.
 * @param {Function} getCurrentSettings - Returns current settings.
 * @param {Function} handleUpdate - Persist function.
 */
export function renderFeatureFlagSwitches(
  container,
  flags,
  getCurrentSettings,
  handleUpdate,
  onToggleInfo
) {
  if (!container || !flags) return;
  Object.keys(flags).forEach((flag) => {
    const kebab = flag.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    const info = flags[flag];
    const wrapper = createToggleSwitch(info.label, {
      id: `feature-${kebab}`,
      name: flag,
      checked: Boolean(getCurrentSettings().featureFlags[flag]?.enabled),
      ariaLabel: info.label
    });
    const desc = document.createElement("p");
    desc.className = "settings-description";
    desc.textContent = info.description;
    wrapper.appendChild(desc);
    container.appendChild(wrapper);
    const input = wrapper.querySelector("input");
    input.addEventListener("change", () => {
      const prev = !input.checked;
      const updated = {
        ...getCurrentSettings().featureFlags,
        [flag]: { ...info, enabled: input.checked }
      };
      handleUpdate("featureFlags", updated, () => {
        input.checked = prev;
      }).then(() => {
        if (onToggleInfo) onToggleInfo(info.label, info.description);
      });
    });
  });
}

export { applyInputState };
