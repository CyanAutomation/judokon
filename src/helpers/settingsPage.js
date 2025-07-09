import { loadSettings, updateSetting } from "./settingsUtils.js";
import { loadGameModes, updateGameModeHidden } from "./gameModeUtils.js";
import { showSettingsError } from "./showSettingsError.js";
import { createToggleSwitch } from "../components/ToggleSwitch.js";
import { applyMotionPreference } from "./motionUtils.js";

function applyInputState(element, value) {
  if (!element) return;
  if (element.type === "checkbox") {
    element.checked = Boolean(value);
  } else {
    element.value = value;
  }
}

function initializeControls(settings, gameModes) {
  let currentSettings = { ...settings };

  const soundToggle = document.getElementById("sound-toggle");
  const navToggle = document.getElementById("navmap-toggle");
  const motionToggle = document.getElementById("motion-toggle");
  const displaySelect = document.getElementById("display-mode-select");
  const modesContainer = document.getElementById("game-mode-toggle-container");

  applyInputState(soundToggle, currentSettings.sound);
  applyInputState(navToggle, currentSettings.fullNavMap);
  applyInputState(motionToggle, currentSettings.motionEffects);
  applyInputState(displaySelect, currentSettings.displayMode);

  function handleUpdate(key, value, revert) {
    updateSetting(key, value)
      .then((updated) => {
        currentSettings = updated;
      })
      .catch((err) => {
        console.error("Failed to update setting", err);
        revert();
        showSettingsError();
      });
  }

  soundToggle?.addEventListener("change", () => {
    const prev = !soundToggle.checked; // previous state
    handleUpdate("sound", soundToggle.checked, () => {
      soundToggle.checked = prev;
    });
  });

  navToggle?.addEventListener("change", () => {
    const prev = !navToggle.checked;
    handleUpdate("fullNavMap", navToggle.checked, () => {
      navToggle.checked = prev;
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

  displaySelect?.addEventListener("change", () => {
    const previous = currentSettings.displayMode;
    handleUpdate("displayMode", displaySelect.value, () => {
      displaySelect.value = previous;
    });
  });

  if (modesContainer && Array.isArray(gameModes)) {
    const sortedModes = [...gameModes].sort((a, b) => a.order - b.order);
    sortedModes.forEach((mode) => {
      const isChecked = Object.hasOwn(currentSettings.gameModes, mode.id)
        ? currentSettings.gameModes[mode.id]
        : !mode.isHidden;
      const wrapper = createToggleSwitch(`${mode.name} (${mode.category} - ${mode.order})`, {
        id: `mode-${mode.id}`,
        name: mode.id,
        checked: isChecked,
        ariaLabel: mode.name
      });

      modesContainer.appendChild(wrapper);
      const input = wrapper.querySelector("input");

      input.addEventListener("change", () => {
        const prev = !input.checked;
        const updated = {
          ...currentSettings.gameModes,
          [mode.id]: input.checked
        };
        handleUpdate("gameModes", updated, () => {
          input.checked = prev;
        });
        updateGameModeHidden(mode.id, !input.checked).catch((err) => {
          console.error("Failed to update game mode", err);
          input.checked = prev; // Revert to previous state
          showSettingsError(); // Notify the user of the error
        });
      });
    });
  }
}

async function initializeSettingsPage() {
  try {
    const settings = await loadSettings();
    const gameModes = await loadGameModes();
    initializeControls(settings, gameModes);
  } catch (error) {
    console.error("Error loading settings page:", error);
    showSettingsError();
  }
}

if (document.readyState !== "loading") {
  initializeSettingsPage();
} else {
  document.addEventListener("DOMContentLoaded", initializeSettingsPage);
}
