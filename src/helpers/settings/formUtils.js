import { createToggleSwitch } from "../../components/ToggleSwitch.js";
import { applyDisplayMode } from "../displayMode.js";
import { applyMotionPreference } from "../motionUtils.js";
import { updateNavigationItemHidden } from "../gameModeUtils.js";
import { showSettingsError } from "../showSettingsError.js";

function applyInputState(element, value) {
  if (!element) return;
  if (element.type === "checkbox") {
    element.checked = Boolean(value);
  } else {
    element.value = value;
  }
}

export function applyInitialControlValues(controls, settings) {
  applyInputState(controls.soundToggle, settings.sound);
  applyInputState(controls.motionToggle, settings.motionEffects);
  if (controls.displayRadios) {
    controls.displayRadios.forEach((radio) => {
      radio.checked = radio.value === settings.displayMode;
    });
  }
  applyInputState(controls.typewriterToggle, settings.typewriterEffect);
}

export function attachToggleListeners(controls, getCurrentSettings, handleUpdate) {
  const { soundToggle, motionToggle, displayRadios, typewriterToggle } = controls;
  soundToggle?.addEventListener("change", () => {
    const prev = !soundToggle.checked;
    handleUpdate("sound", soundToggle.checked, () => {
      soundToggle.checked = prev;
    });
  });
  motionToggle?.addEventListener("change", () => {
    const prev = !motionToggle.checked;
    applyMotionPreference(motionToggle.checked);
    handleUpdate("motionEffects", motionToggle.checked, () => {
      motionToggle.checked = prev;
      applyMotionPreference(prev);
    });
  });
  if (displayRadios) {
    displayRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        if (!radio.checked) return;
        const previous = getCurrentSettings().displayMode;
        const mode = radio.value;
        applyDisplayMode(mode);
        handleUpdate("displayMode", mode, () => {
          const prevRadio = Array.from(displayRadios).find((r) => r.value === previous);
          if (prevRadio) prevRadio.checked = true;
          applyDisplayMode(previous);
        });
      });
    });
  }
  typewriterToggle?.addEventListener("change", () => {
    const prev = !typewriterToggle.checked;
    handleUpdate("typewriterEffect", typewriterToggle.checked, () => {
      typewriterToggle.checked = prev;
    });
  });
}

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

export function renderFeatureFlagSwitches(container, flags, getCurrentSettings, handleUpdate) {
  if (!container || !flags) return;
  Object.keys(flags).forEach((flag) => {
    const kebab = flag.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    const label = flag.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
    const wrapper = createToggleSwitch(label, {
      id: `feature-${kebab}`,
      name: flag,
      checked: Boolean(getCurrentSettings().featureFlags[flag]),
      ariaLabel: label
    });
    container.appendChild(wrapper);
    const input = wrapper.querySelector("input");
    input.addEventListener("change", () => {
      const prev = !input.checked;
      const updated = {
        ...getCurrentSettings().featureFlags,
        [flag]: input.checked
      };
      handleUpdate("featureFlags", updated, () => {
        input.checked = prev;
      });
    });
  });
}
