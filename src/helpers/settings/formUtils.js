import { createToggleSwitch } from "../../components/ToggleSwitch.js";
import { applyDisplayMode } from "../displayMode.js";
import { withViewTransition } from "../viewTransition.js";
import { applyMotionPreference } from "../motionUtils.js";
import { updateNavigationItemHidden } from "../gameModeUtils.js";
import { showSettingsError } from "../showSettingsError.js";
import { showSnackbar } from "../showSnackbar.js";
import { toggleViewportSimulation } from "../viewportDebug.js";
import { toggleTooltipOverlayDebug } from "../tooltipOverlayDebug.js";
import { toggleLayoutDebugPanel } from "../layoutDebugPanel.js";
import { showSettingsInfo } from "../showSettingsInfo.js";

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
 * @param {Record<string, string>} [tooltipMap] - Flattened tooltip lookup.
 */
export function applyInitialControlValues(controls, settings, tooltipMap = {}) {
  applyInputState(controls.soundToggle, settings.sound);
  if (controls.soundToggle && settings.tooltipIds?.sound) {
    controls.soundToggle.dataset.tooltipId = settings.tooltipIds.sound;
  }
  const soundLabel = tooltipMap["settings.sound.label"];
  const soundDesc = tooltipMap["settings.sound.description"];
  const soundLabelEl = controls.soundToggle?.closest("label")?.querySelector("span");
  const soundDescEl = document.getElementById("sound-desc");
  if (soundLabel && soundLabelEl) soundLabelEl.textContent = soundLabel;
  if (soundDesc && soundDescEl) soundDescEl.textContent = soundDesc;
  applyInputState(controls.motionToggle, settings.motionEffects);
  if (controls.motionToggle && settings.tooltipIds?.motionEffects) {
    controls.motionToggle.dataset.tooltipId = settings.tooltipIds.motionEffects;
  }
  const motionLabel = tooltipMap["settings.motionEffects.label"];
  const motionDesc = tooltipMap["settings.motionEffects.description"];
  const motionLabelEl = controls.motionToggle?.closest("label")?.querySelector("span");
  const motionDescEl = document.getElementById("motion-desc");
  if (motionLabel && motionLabelEl) motionLabelEl.textContent = motionLabel;
  if (motionDesc && motionDescEl) motionDescEl.textContent = motionDesc;
  if (controls.displayRadios) {
    controls.displayRadios.forEach((radio) => {
      const isSelected = radio.value === settings.displayMode;
      radio.checked = isSelected;
      radio.tabIndex = isSelected ? 0 : -1;
    });
  }
  applyInputState(controls.typewriterToggle, settings.typewriterEffect);
  if (controls.typewriterToggle && settings.tooltipIds?.typewriterEffect) {
    controls.typewriterToggle.dataset.tooltipId = settings.tooltipIds.typewriterEffect;
  }
  const typeLabel = tooltipMap["settings.typewriterEffect.label"];
  const typeDesc = tooltipMap["settings.typewriterEffect.description"];
  const typeLabelEl = controls.typewriterToggle?.closest("label")?.querySelector("span");
  const typeDescEl = document.getElementById("typewriter-desc");
  if (typeLabel && typeLabelEl) typeLabelEl.textContent = typeLabel;
  if (typeDesc && typeDescEl) typeDescEl.textContent = typeDesc;
  applyInputState(controls.tooltipsToggle, settings.tooltips);
  if (controls.tooltipsToggle && settings.tooltipIds?.tooltips) {
    controls.tooltipsToggle.dataset.tooltipId = settings.tooltipIds.tooltips;
  }
  const tipsLabel = tooltipMap["settings.tooltips.label"];
  const tipsDesc = tooltipMap["settings.tooltips.description"];
  const tipsLabelEl = controls.tooltipsToggle?.closest("label")?.querySelector("span");
  const tipsDescEl = document.getElementById("tooltips-desc");
  if (tipsLabel && tipsLabelEl) tipsLabelEl.textContent = tipsLabel;
  if (tipsDesc && tipsDescEl) tipsDescEl.textContent = tipsDesc;
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
 * @param {(key: string, value: any, revert: Function) => Promise<any>} handleUpdate -
 *   Persist function that returns a Promise.
 */
export function attachToggleListeners(controls, getCurrentSettings, handleUpdate) {
  const { soundToggle, motionToggle, displayRadios, typewriterToggle, tooltipsToggle } = controls;
  soundToggle?.addEventListener("change", () => {
    const prev = !soundToggle.checked;
    Promise.resolve(
      handleUpdate("sound", soundToggle.checked, () => {
        soundToggle.checked = prev;
      })
    ).then(() => {
      showSnackbar(`Sound ${soundToggle.checked ? "enabled" : "disabled"}`);
    });
  });
  motionToggle?.addEventListener("change", () => {
    const prev = !motionToggle.checked;
    applyMotionPreference(motionToggle.checked);
    Promise.resolve(
      handleUpdate("motionEffects", motionToggle.checked, () => {
        motionToggle.checked = prev;
        applyMotionPreference(prev);
      })
    ).then(() => {
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
        Promise.resolve(
          handleUpdate("displayMode", mode, () => {
            const prevRadio = Array.from(displayRadios).find((r) => r.value === previous);
            if (prevRadio) prevRadio.checked = true;
            displayRadios.forEach((r) => {
              r.tabIndex = r.value === previous ? 0 : -1;
            });
            withViewTransition(() => {
              applyDisplayMode(previous);
            });
          })
        ).then(() => {
          const label = mode.charAt(0).toUpperCase() + mode.slice(1);
          showSnackbar(`${label} mode enabled`);
        });
      });
    });
  }
  typewriterToggle?.addEventListener("change", () => {
    const prev = !typewriterToggle.checked;
    Promise.resolve(
      handleUpdate("typewriterEffect", typewriterToggle.checked, () => {
        typewriterToggle.checked = prev;
      })
    ).then(() => {
      showSnackbar(`Typewriter effect ${typewriterToggle.checked ? "enabled" : "disabled"}`);
    });
  });
  tooltipsToggle?.addEventListener("change", () => {
    const prev = !tooltipsToggle.checked;
    Promise.resolve(
      handleUpdate("tooltips", tooltipsToggle.checked, () => {
        tooltipsToggle.checked = prev;
      })
    ).then(() => {
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
    const wrapper = createToggleSwitch(`${mode.name} (${mode.category} - ${mode.order})`, {
      id: `mode-${mode.id}`,
      name: mode.id,
      checked: isChecked,
      ariaLabel: mode.name
    });
    const input = wrapper.querySelector("input");
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
        showSnackbar(`${mode.name} ${input.checked ? "enabled" : "disabled"}`);
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
 * 3. After saving, show a snackbar confirming the new state.
 * 4. When toggling `viewportSimulation`, call `toggleViewportSimulation`.
 *
 * @param {HTMLElement} container - Container for the switches.
 * @param {Record<string, { enabled: boolean, tooltipId?: string }>} flags - Feature flag metadata.
 * @param {Function} getCurrentSettings - Returns current settings.
 * @param {Function} handleUpdate - Persist function.
 * @param {Record<string, string>} [tooltipMap] - Flattened tooltip lookup.
 */
export function renderFeatureFlagSwitches(
  container,
  flags,
  getCurrentSettings,
  handleUpdate,
  tooltipMap = {}
) {
  if (!container || !flags) return;
  Object.keys(flags).forEach((flag) => {
    const kebab = flag.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    const info = flags[flag];
    const tipId = info.tooltipId || `settings.${flag}`;
    const label = tooltipMap[`${tipId}.label`] || flag;
    const description = tooltipMap[`${tipId}.description`] || "";
    const wrapper = createToggleSwitch(label, {
      id: `feature-${kebab}`,
      name: flag,
      checked: Boolean(getCurrentSettings().featureFlags[flag]?.enabled),
      ariaLabel: label,
      tooltipId: info.tooltipId
    });
    const input = wrapper.querySelector("input");
    if (input) input.dataset.flag = flag;
    const desc = document.createElement("p");
    desc.className = "settings-description";
    desc.id = `feature-${kebab}-desc`;
    desc.textContent = description;
    wrapper.appendChild(desc);
    if (input) input.setAttribute("aria-describedby", desc.id);
    container.appendChild(wrapper);
    if (!input) return;
    input.addEventListener("change", () => {
      const prev = !input.checked;
      const updated = {
        ...getCurrentSettings().featureFlags,
        [flag]: { ...info, enabled: input.checked }
      };
      Promise.resolve(
        handleUpdate("featureFlags", updated, () => {
          input.checked = prev;
        })
      ).then(() => {
        showSnackbar(`${label} ${input.checked ? "enabled" : "disabled"}`);
        if (flag === "viewportSimulation") {
          toggleViewportSimulation(input.checked);
        }
        if (flag === "tooltipOverlayDebug") {
          toggleTooltipOverlayDebug(input.checked);
        }
        if (flag === "layoutDebugPanel") {
          toggleLayoutDebugPanel(input.checked);
        }
        if (
          [
            "showCardOfTheDay",
            "viewportSimulation",
            "tooltipOverlayDebug",
            "layoutDebugPanel"
          ].includes(flag)
        ) {
          const tipLabel = tooltipMap[`${tipId}.label`] || label;
          const tipDesc = tooltipMap[`${tipId}.description`] || description;
          showSettingsInfo(tipLabel, tipDesc);
        }
      });
    });
  });
}

export { applyInputState };
