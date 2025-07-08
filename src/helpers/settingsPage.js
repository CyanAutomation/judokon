import { loadSettings, updateSetting } from "./settingsUtils.js";
import { fetchJson } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";
import { showSettingsError } from "./showSettingsError.js";

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
    handleUpdate("motionEffects", motionToggle.checked, () => {
      motionToggle.checked = prev;
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
      const label = document.createElement("label");
      label.className = "settings-item";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = `mode-${mode.id}`;
      input.checked = currentSettings.gameModes[mode.id] !== false;
      input.setAttribute("aria-label", mode.name);
      const span = document.createElement("span");
      span.textContent = mode.name;
      label.appendChild(input);
      label.appendChild(span);
      modesContainer.appendChild(label);

      input.addEventListener("change", () => {
        const prev = !input.checked;
        const updated = {
          ...currentSettings.gameModes,
          [mode.id]: input.checked
        };
        handleUpdate("gameModes", updated, () => {
          input.checked = prev;
        });
      });
    });
  }
}

async function initializeSettingsPage() {
  try {
    const settings = await loadSettings();
    const gameModes = await fetchJson(`${DATA_DIR}gameModes.json`);
    initializeControls(settings, gameModes);
  } catch (error) {
    console.error("Error loading settings page:", error);
    showSettingsError();
  }
}

document.addEventListener("DOMContentLoaded", initializeSettingsPage);
